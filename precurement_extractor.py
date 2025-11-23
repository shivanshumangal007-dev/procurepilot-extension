import json
import re
import os
from datetime import datetime
from typing import Dict, List, Optional, Any
import pdfplumber

# Optional imports for Donut (Vision Transformer)
DONUT_AVAILABLE = False
try:
    from pdf2image import convert_from_path
    from transformers import DonutProcessor, VisionEncoderDecoderModel
    from PIL import Image
    import torch
    DONUT_AVAILABLE = True
except ImportError as e:
    # Silently skip - Donut is optional
    pass
except Exception as e:
    # Catch any other errors during import
    pass

class ProcurementPDFExtractor:
    """
    Hybrid PDF extraction module for procurement documents.
    Uses pdfplumber for clean PDFs, falls back to Donut (Vision Transformer) for scanned/noisy PDFs.
    """
    
    def __init__(self):
        self.donut_model = None
        self.donut_processor = None
        self.min_text_threshold = 20
        
    def load_donut_model(self):
        """Lazy load Donut model only when needed"""
        if not DONUT_AVAILABLE:
            raise ImportError(
                "Donut dependencies not installed. Install with: "
                "pip install transformers torch pdf2image pillow"
            )
        
        if self.donut_model is None:
            print("Loading Donut model...")
            self.donut_processor = DonutProcessor.from_pretrained("naver-clova-ix/donut-base")
            self.donut_model = VisionEncoderDecoderModel.from_pretrained("naver-clova-ix/donut-base")
            self.donut_model.eval()
    
    def extract_with_pdfplumber(self, pdf_path: str) -> Dict[str, Any]:
        """Extract text and tables using pdfplumber"""
        extracted_data = {
            "text": "",
            "tables": [],
            "success": False
        }
        
        try:
            # Verify file exists
            import os
            if not os.path.exists(pdf_path):
                print(f"Error: File not found at {pdf_path}")
                return extracted_data
            
            with pdfplumber.open(pdf_path) as pdf:
                all_text = []
                all_tables = []
                
                for page in pdf.pages:
                    # Extract text
                    page_text = page.extract_text()
                    if page_text:
                        all_text.append(page_text)
                    
                    # Extract tables
                    tables = page.extract_tables()
                    if tables:
                        all_tables.extend(tables)
                
                extracted_data["text"] = "\n".join(all_text)
                extracted_data["tables"] = all_tables
                
                # Check if extraction was successful
                if len(extracted_data["text"].strip()) > self.min_text_threshold:
                    extracted_data["success"] = True
                    
        except Exception as e:
            print(f"pdfplumber extraction failed: {str(e)}")
            extracted_data["success"] = False
            
        return extracted_data
    
    def extract_with_donut(self, pdf_path: str) -> Dict[str, Any]:
        """Extract data using Donut Vision Transformer"""
        if not DONUT_AVAILABLE:
            print("Donut not available. Skipping vision-based extraction.")
            return {"text": "", "success": False}
        
        self.load_donut_model()
        
        extracted_data = {
            "text": "",
            "success": False
        }
        
        try:
            # Convert PDF first page to image
            images = convert_from_path(pdf_path, first_page=1, last_page=1)
            if not images:
                return extracted_data
            
            image = images[0]
            
            # Prepare image for Donut
            pixel_values = self.donut_processor(image, return_tensors="pt").pixel_values
            
            # Generate text from image
            with torch.no_grad():
                outputs = self.donut_model.generate(
                    pixel_values,
                    max_length=512,
                    early_stopping=True,
                    pad_token_id=self.donut_processor.tokenizer.pad_token_id,
                    eos_token_id=self.donut_processor.tokenizer.eos_token_id,
                    use_cache=True,
                    num_beams=1,
                    bad_words_ids=[[self.donut_processor.tokenizer.unk_token_id]],
                    return_dict_in_generate=True,
                )
            
            # Decode output
            sequence = self.donut_processor.batch_decode(outputs.sequences)[0]
            sequence = sequence.replace(self.donut_processor.tokenizer.eos_token, "").replace(
                self.donut_processor.tokenizer.pad_token, ""
            )
            
            extracted_data["text"] = sequence
            extracted_data["success"] = True
            
        except Exception as e:
            print(f"Donut extraction failed: {str(e)}")
            extracted_data["success"] = False
            
        return extracted_data
    
    def normalize_date(self, date_str: str) -> Optional[str]:
        """Normalize date to YYYY-MM-DD format"""
        if not date_str or date_str == "null":
            return None
            
        date_patterns = [
            r'(\d{4})-(\d{2})-(\d{2})',  # YYYY-MM-DD
            r'(\d{2})/(\d{2})/(\d{4})',  # DD/MM/YYYY
            r'(\d{2})-(\d{2})-(\d{4})',  # DD-MM-YYYY
            r'(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})',  # DD Month YYYY
        ]
        
        for pattern in date_patterns:
            match = re.search(pattern, str(date_str))
            if match:
                try:
                    if pattern == date_patterns[0]:  # Already in correct format
                        return match.group(0)
                    elif pattern in [date_patterns[1], date_patterns[2]]:
                        day, month, year = match.groups()
                        return f"{year}-{month.zfill(2)}-{day.zfill(2)}"
                    elif pattern == date_patterns[3]:
                        day, month_str, year = match.groups()
                        month = datetime.strptime(month_str[:3], '%b').month
                        return f"{year}-{str(month).zfill(2)}-{day.zfill(2)}"
                except:
                    continue
        return None
    
    def normalize_currency(self, amount_str: str) -> Optional[str]:
        """Normalize currency amounts"""
        if not amount_str:
            return None
            
        # Remove currency symbols and clean
        cleaned = re.sub(r'[^\d.,\-]', '', str(amount_str))
        cleaned = cleaned.replace(',', '')
        
        try:
            return str(float(cleaned))
        except:
            return None
    
    def extract_field(self, text: str, patterns: List[str]) -> Optional[str]:
        """Extract field using regex patterns"""
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip()
        return None
    
    def detect_document_type(self, text: str) -> str:
        """Detect document type from content"""
        text_lower = text.lower()
        
        if any(term in text_lower for term in ['pre-qualification', 'prequalification', 'pq form', 'turnover']):
            return "PQ_FORM"
        elif any(term in text_lower for term in ['impairment', 'asset impairment']):
            return "IMPAIRMENT_FORM"
        elif 'invoice' in text_lower:
            return "INVOICE"
        elif any(term in text_lower for term in ['purchase order', 'p.o.', 'po number']):
            return "PURCHASE_ORDER"
        elif any(term in text_lower for term in ['delivery note', 'delivery report', 'goods received']):
            return "DELIVERY_NOTE"
        elif any(term in text_lower for term in ['vendor', 'supplier', 'onboarding']):
            return "VENDOR_ONBOARDING"
        else:
            return "UNKNOWN"
    
    def extract_line_items(self, text: str, tables: List) -> List[Dict]:
        """Extract line items from tables or text"""
        line_items = []
        
        # Try to extract from tables first
        for table in tables:
            if len(table) < 2:  # Need at least header + 1 row
                continue
                
            header = table[0]
            for row in table[1:]:
                if len(row) >= 3:
                    item = {
                        "description": row[0] if len(row) > 0 else None,
                        "quantity": self.normalize_currency(row[1]) if len(row) > 1 else None,
                        "unit_price": self.normalize_currency(row[2]) if len(row) > 2 else None,
                        "amount": self.normalize_currency(row[3]) if len(row) > 3 else None
                    }
                    line_items.append(item)
        
        return line_items if line_items else []
    
    def extract_turnover(self, text: str) -> List[Dict]:
        """Extract turnover data for last 3 years"""
        turnover_data = []
        
        # Look for patterns like "2021: $1,000,000" or "Year 2021: 1000000"
        patterns = [
            r'(\d{4})[:\s]+[^\d]*?([\d,\.]+)',
            r'year[:\s]+(\d{4})[^\d]*?([\d,\.]+)',
        ]
        
        for pattern in patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                year = match.group(1)
                amount = self.normalize_currency(match.group(2))
                if amount:
                    turnover_data.append({
                        "year": year,
                        "amount": amount
                    })
        
        return turnover_data[:3]  # Last 3 years
    
    def check_eligibility(self, data: Dict) -> Dict:
        """Check eligibility based on extracted data"""
        eligibility = {
            "is_eligible": None,
            "reason": ""
        }
        
        # Example eligibility logic (customize as needed)
        if data.get("turnover_last_3_years"):
            total_turnover = sum(float(t.get("amount", 0)) for t in data["turnover_last_3_years"])
            if total_turnover >= 1000000:  # Example threshold
                eligibility["is_eligible"] = True
                eligibility["reason"] = "Meets minimum turnover requirement"
            else:
                eligibility["is_eligible"] = False
                eligibility["reason"] = "Below minimum turnover threshold"
        
        return eligibility
    
    def extract_procurement_data(self, pdf_path: str) -> Dict[str, Any]:
        """
        Main extraction method - implements hybrid approach
        """
        # Step 1: Try pdfplumber first
        print("Attempting pdfplumber extraction...")
        plumber_data = self.extract_with_pdfplumber(pdf_path)
        
        # Step 2: If pdfplumber fails, use Donut
        if not plumber_data["success"]:
            print("pdfplumber extraction insufficient. Falling back to Donut...")
            donut_data = self.extract_with_donut(pdf_path)
            raw_text = donut_data["text"]
            tables = []
            method_used = "donut"
        else:
            raw_text = plumber_data["text"]
            tables = plumber_data["tables"]
            method_used = "pdfplumber"
        
        # Step 3: Detect document type
        doc_type = self.detect_document_type(raw_text)
        
        # Step 4: Extract fields using patterns
        vendor_patterns = [
            r'vendor[:\s]+([^\n]+)',
            r'supplier[:\s]+([^\n]+)',
            r'company[:\s]+([^\n]+)',
            r'buyer[:\s]+([^\n]+)',
            r'^([A-Z][A-Za-z\s]+(?:Inc|Corp|LLC|Ltd|Limited|Co|Corporation|Solutions|Technologies|Enterprises)\.?)',
        ]
        
        invoice_patterns = [
            r'invoice\s*(?:number|no|#)[:\s]+([^\n\s]+)',
            r'inv[:\s]+([^\n\s]+)'
        ]
        
        po_patterns = [
            r'PO\s+Ref:\s*([A-Z0-9\-]+)',
            r'P\.?O\.?\s*Ref:\s*([A-Z0-9\-]+)',
            r'(?:Purchase Order|PO|P\.O\.)\s*(?:Number|No|#|:)\s*[:]?\s*([A-Z0-9\-]+)',
            r'(?:po|p\.o\.)\s*ref:\s*([^\n\s]+)'
        ]
        
        tax_patterns = [
            r'(?:tax|gst|vat)\s*(?:id|number|no)?[:\s]+([^\n\s]+)',
            r'gstin[:\s]+([^\n\s]+)'
        ]
        
        date_patterns = [
            r'(?:invoice\s*)?date[:\s]+([^\n]+)',
            r'dated?[:\s]+([^\n]+)'
        ]
        
        total_patterns = [
            r'total[:\s]+[^\d]*?([\d,\.]+)',
            r'grand\s+total[:\s]+[^\d]*?([\d,\.]+)',
            r'amount[:\s]+[^\d]*?([\d,\.]+)'
        ]
        
        # Step 5: Build structured output
        output = {
            "document_type": doc_type,
            "vendor_name": self.extract_field(raw_text, vendor_patterns),
            "vendor_address": None,  # Complex extraction - would need more sophisticated parsing
            "tax_id": self.extract_field(raw_text, tax_patterns),
            "invoice_number": self.extract_field(raw_text, invoice_patterns),
            "po_number": self.extract_field(raw_text, po_patterns),
            "invoice_date": self.normalize_date(self.extract_field(raw_text, date_patterns)),
            "delivery_date": None,
            "total_amount": self.normalize_currency(self.extract_field(raw_text, total_patterns)),
            "currency": "USD" if "$" in raw_text else "INR" if "₹" in raw_text else None,
            "turnover_last_3_years": self.extract_turnover(raw_text) if doc_type == "PQ_FORM" else [],
            "budget_requirement": None,
            "eligibility_check": {},
            "line_items": self.extract_line_items(raw_text, tables),
            "raw_text": raw_text[:1000],  # Truncate for output size
            "method_used": method_used
        }
        
        # Step 6: Check eligibility if applicable
        if doc_type == "PQ_FORM":
            output["eligibility_check"] = self.check_eligibility(output)
        
        # Step 7: Clean nulls - replace None with "null" string for JSON
        output = self._clean_nulls(output)
        
        return output
    
    def _clean_nulls(self, data: Any) -> Any:
        """Recursively replace None with 'null' string"""
        if isinstance(data, dict):
            return {k: self._clean_nulls(v) for k, v in data.items()}
        elif isinstance(data, list):
            return [self._clean_nulls(item) for item in data]
        elif data is None:
            return "null"
        else:
            return data


# Usage example
def process_pdf(pdf_path: str) -> str:
    """
    Process a procurement PDF and return structured JSON
    """
    extractor = ProcurementPDFExtractor()
    result = extractor.extract_procurement_data(pdf_path)
    return json.dumps(result, indent=2, ensure_ascii=False)


# Main execution
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python script.py <path_to_pdf>")
        sys.exit(1)
    
    pdf_file = sys.argv[1]
    json_output = process_pdf(pdf_file)
    print(json_output)