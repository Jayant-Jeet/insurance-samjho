import modal

image = (
    modal.Image.debian_slim()
    .pip_install("vllm", "fastapi")
    .env({"VLLM_USE_FLASHINFER_SAMPLER": "0"})
)

app = modal.App("insurance-samjho-vllm", image=image)


@app.cls(
    gpu="L40S",
    image=image,
    scaledown_window=300,
    secrets=[modal.Secret.from_name("huggingface-secret")],
)
class CloudLLM:
    @modal.enter()
    def setup(self):
        from vllm import LLM

        self.llm = LLM(
            model="google/gemma-2-9b-it",
            max_model_len=8192,
            structured_outputs_config={"backend": "guidance", "disable_any_whitespace": True},
        )

    @modal.fastapi_endpoint(method="POST")
    def process(self, request: dict):
        from vllm import SamplingParams

        prompt = request["prompt"]
        schema = request.get("schema")
        n_prompt = len(self.llm.get_tokenizer().encode(prompt))
        max_tokens = max(512, 8192 - n_prompt - 32)
        try:
            from vllm.sampling_params import StructuredOutputsParams  # noqa

            params = SamplingParams(
                temperature=0.0,
                max_tokens=max_tokens,
                structured_outputs=StructuredOutputsParams(
                    json=schema, disable_any_whitespace=True
                ),
            )
        except ImportError:
            params = SamplingParams(
                temperature=0.0, max_tokens=max_tokens, guided_json=schema
            )
        outputs = self.llm.generate([prompt], params)
        return {"choices": [{"message": {"content": outputs[0].outputs[0].text}}]}
