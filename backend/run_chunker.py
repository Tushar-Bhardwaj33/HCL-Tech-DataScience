# Simple runner for PDFChunker using the repository 'data' directory
import os
from rag.chunking.pdf_chunker import PDFChunker

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')
DATA_DIR = os.path.abspath(DATA_DIR)

def find_first_pdf(data_dir):
    if not os.path.isdir(data_dir):
        return None
    for fn in os.listdir(data_dir):
        if fn.lower().endswith('.pdf'):
            return os.path.join(data_dir, fn)
    return None


def main():
    pdf_path = find_first_pdf(DATA_DIR)
    if not pdf_path:
        print(f"No PDF files found in {DATA_DIR}")
        return

    print(f"Using PDF: {pdf_path}")
    chunker = PDFChunker(output_path=os.path.dirname(pdf_path))
    chunks = chunker.chunk_pdf(os.path.basename(pdf_path))
    print(f"Extracted {len(chunks)} chunks")
    print(f"Text chunks: {len(chunker.get_texts())}")
    print(f"Image count: {len(chunker.get_images())}")

if __name__ == '__main__':
    main()
