from email import policy
from email.parser import BytesParser
from io import BytesIO
from pypdf import PdfReader

def extract_document(filename: str, content: bytes) -> str:
    lower = filename.lower()

    if lower.endswith(".pdf"):
        reader = PdfReader(BytesIO(content))
        return "\n".join((page.extract_text() or "") for page in reader.pages).strip()

    if lower.endswith(".eml"):
        message = BytesParser(policy=policy.default).parsebytes(content)
        body = message.get_body(preferencelist=("plain", "html"))
        return (body.get_content() if body else "").strip()

    if lower.endswith(".txt"):
        return content.decode("utf-8", errors="ignore").strip()

    raise ValueError("Supported uploads are PDF, TXT and EML.")
