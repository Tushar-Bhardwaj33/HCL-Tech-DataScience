from .get import GET
import os

__all__ = [
    "PDFChunker"
]

"""references: https://docs.unstructured.io/open-source/core-functionality/partitioning"""

class PDFChunker:
    DEFAULT_IMAGE_BLOCK_TYPES = ["Image"]
    DEFAULT_CHUNKING_STRATEGY = "by_title"

    def __init__(
        self,
        output_path: str = "./content/",
        infer_table_structure: bool = True,
        strategy: str = "hi_res",
        extract_image_block_types: list = ["Image"],
        extract_image_block_to_payload: bool = True,
        chunking_strategy: str = "by_title",
        max_characters: int = 10000,
        combine_text_under_n_chars: int = 2000,
        new_after_n_chars: int = 6000
    ):
        self.chunks = None
        self.output_path = output_path
        self.infer_table_structure = infer_table_structure
        self.strategy = strategy
        self.extract_image_block_types = extract_image_block_types
        self.extract_image_block_to_payload = extract_image_block_to_payload
        self.chunking_strategy = chunking_strategy
        self.max_characters = max_characters
        self.combine_text_under_n_chars = combine_text_under_n_chars
        self.new_after_n_chars = new_after_n_chars

    @classmethod
    def get_available_methods(cls):
        return [cls.chunk_pdf, cls.get_texts, cls.get_tables, cls.get_images, cls.get_metadata]

    def _use_partition_pdf(self):
        """Attempt to import partition_pdf from unstructured; return it or None."""
        try:
            from unstructured.partition.pdf import partition_pdf  # type: ignore
            return partition_pdf
        except Exception:
            return None

    def _fallback_chunks_from_pdf(self, file_path: str):
        """Simple fallback when unstructured.partition.pdf is not available.
        Uses PyPDF2 to extract text per page and returns list of simple chunk-like objects.
        """
        try:
            import PyPDF2
        except Exception:
            raise RuntimeError("Neither 'unstructured' nor 'PyPDF2' are available to process PDF files.")

        Reader = PyPDF2.PdfReader
        with open(file_path, "rb") as f:
            reader = Reader(f)
            chunks = []
            for i, page in enumerate(reader.pages):
                text = page.extract_text() or ""
                # create a minimal chunk object compatible with GET functions
                class _Meta:
                    def __init__(self, text):
                        self.text_as_html = text
                        self.orig_elements = []
                class _Chunk:
                    def __init__(self, md):
                        self.metadata = md
                md = _Meta(text)
                chunks.append(_Chunk(md))
        return chunks

    def chunk_pdf(self, file_name: str):
        """Chunk a PDF. If unstructured.partition.pdf is available it will be used, otherwise falls back to PyPDF2 text extraction.

        file_name may be either an absolute/path to a file or a file name relative to self.output_path.
        """
        if not file_name:
            raise ValueError("file_name cannot be empty.")

        # Determine absolute file path
        if os.path.isabs(file_name) and os.path.isfile(file_name):
            file_path = file_name
        else:
            # join with output_path
            file_path = os.path.join(self.output_path, file_name)

        if not os.path.isfile(file_path):
            raise FileNotFoundError(f"PDF file not found: {file_path}")

        partition_pdf = self._use_partition_pdf()
        if partition_pdf is not None:
            # call unstructured partition_pdf with configured options
            self.chunks = partition_pdf(
                filename=file_path,
                infer_table_structure=self.infer_table_structure,
                strategy=self.strategy,
                extract_image_block_types=self.extract_image_block_types,
                extract_image_block_to_payload=self.extract_image_block_to_payload,
                chunking_strategy=self.chunking_strategy,
                max_characters=self.max_characters,
                combine_text_under_n_chars=self.combine_text_under_n_chars,
                new_after_n_chars=self.new_after_n_chars,
            )
        else:
            # fallback: simple text-per-page chunks
            self.chunks = self._fallback_chunks_from_pdf(file_path)

        return self.chunks
    
    def get_images(self):
        if not self.chunks:
            return []
        return GET.get_images(self.chunks)

    def get_texts(self):
        if not self.chunks:
            return []
        return GET.get_texts(self.chunks)

    def get_tables(self):
        if not self.chunks:
            return []
        return GET.get_tables(self.chunks)
    
    def get_metadata(self):
        if not self.chunks:
            return []
        return GET.get_metadata(self.chunks)