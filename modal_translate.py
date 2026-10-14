import modal

MODEL = "ai4bharat/indictrans2-en-indic-1B"


def download():
    from huggingface_hub import snapshot_download

    snapshot_download(MODEL)


image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("git")
    .pip_install(
        "torch==2.4.1",
        "transformers==4.44.2",
        "sentencepiece",
        "sacremoses",
        "nltk",
        "IndicTransToolkit",
        "fastapi",
        "huggingface_hub",
    )
    .run_function(download, secrets=[modal.Secret.from_name("huggingface-secret")])
)

app = modal.App("insurance-samjho-translate", image=image)


@app.cls(gpu="L4", scaledown_window=300, secrets=[modal.Secret.from_name("huggingface-secret")])
class Translator:
    @modal.enter()
    def setup(self):
        import torch
        from IndicTransToolkit.processor import IndicProcessor
        from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

        self.tok = AutoTokenizer.from_pretrained(MODEL, trust_remote_code=True)
        self.model = AutoModelForSeq2SeqLM.from_pretrained(
            MODEL, trust_remote_code=True, torch_dtype=torch.float16
        ).to("cuda")
        self.ip = IndicProcessor(inference=True)

    @modal.fastapi_endpoint(method="POST")
    def translate(self, request: dict):
        import torch

        texts = request["texts"]
        out = []
        for i in range(0, len(texts), 16):
            batch = self.ip.preprocess_batch(texts[i:i + 16], src_lang="eng_Latn", tgt_lang="hin_Deva")
            inputs = self.tok(
                batch, truncation=True, padding="longest", max_length=256,
                return_tensors="pt", return_attention_mask=True,
            ).to("cuda")
            with torch.no_grad():
                gen = self.model.generate(
                    **inputs, use_cache=True, min_length=0, max_length=256,
                    num_beams=4, num_return_sequences=1,
                )
            dec = self.tok.batch_decode(
                gen.detach().cpu().tolist(), skip_special_tokens=True, clean_up_tokenization_spaces=True
            )
            out += self.ip.postprocess_batch(dec, lang="hin_Deva")
        return {"translations": out}
