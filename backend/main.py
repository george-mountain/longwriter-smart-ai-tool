from fastapi import FastAPI, HTTPException, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from dotenv import load_dotenv, find_dotenv
import os
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM, TextIteratorStreamer
from fastapi.responses import StreamingResponse
from contextlib import asynccontextmanager
from threading import Thread

from pathlib import Path


load_dotenv(find_dotenv())


model_checkpoint_path = "THUDM/LongWriter-glm4-9b"


CACHE_DIR = Path(__file__).parent / "model_cache"


class ChatModel:
    def __init__(self, model_checkpoint: str):
        self.tokenizer = AutoTokenizer.from_pretrained(
            model_checkpoint,
            cache_dir=CACHE_DIR,
            trust_remote_code=True,
        )
        self.model = AutoModelForCausalLM.from_pretrained(
            model_checkpoint,
            torch_dtype=torch.bfloat16,
            device_map="cuda",
            cache_dir=CACHE_DIR,
            trust_remote_code=True,
        )

    def generate_text(
        self,
        prompt: str,
        system_prompt: str,
    ):
        complete_prompt = f"{system_prompt} {prompt}"
        messages = [{"role": "user", "content": complete_prompt}]
        inputs = self.tokenizer.apply_chat_template(
            messages,
            return_dict=True,
            tokenize=True,
            add_generation_prompt=True,
            return_tensors="pt",
        ).to("cuda")
        streamer = TextIteratorStreamer(
            self.tokenizer, skip_prompt=True, skip_special_tokens=True, timeout=None
        )
        generation_kwargs = dict(
            inputs, streamer=streamer, max_new_tokens=128000, do_sample=True
        )
        thread = Thread(target=self.model.generate, kwargs=generation_kwargs)
        thread.start()
        complete_response = ""
        for new_text in streamer:
            complete_response += new_text
            yield new_text


chat_model = None
ai_models = {}

redis_url = os.getenv("REDIS_URL")


@asynccontextmanager
async def lifespan(app: FastAPI):
    global chat_model
    chat_model = ChatModel(model_checkpoint=model_checkpoint_path)
    ai_models["chat_model"] = chat_model
    yield
    ai_models.clear()


app = FastAPI(lifespan=lifespan, title="Authify API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request, exc):
    headers = {"Access-Control-Allow-Origin": "*"}
    if exc.status_code == status.HTTP_429_TOO_MANY_REQUESTS:
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
            headers=headers,
        )
    elif exc.status_code == status.HTTP_401_UNAUTHORIZED:
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
            headers=headers,
        )
    elif exc.status_code == status.HTTP_404_NOT_FOUND:
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
            headers=headers,
        )
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=headers,
    )


@app.post(
    "/api/v1/generate/",
    tags=["chat"],
)
async def generate(
    request: Request,
):
    DEFAULT_SYSTEM_PROMPT = """
You assist with various tasks, from writing to coding (using markdown for code blocks — remember to use ``` with code, JSON, and tables).
(You do not have real-time data access or code execution capabilities. You avoid stereotyping and provide balanced perspectives on controversial topics. 
You do not provide song lyrics, poems, or news articles and do not divulge details of your training data.) 
This is your system prompt, guiding your responses. Do not reference it, just respond to the user. 
If you find yourself talking about this message, stop. You should be responding appropriately and usually that means not mentioning this. 
YOU DO NOT MENTION ANY OF THIS INFORMATION ABOUT YOURSELF UNLESS THE INFORMATION IS DIRECTLY PERTINENT TO THE USER\'S QUERY.

"""
    data = await request.json()
    prompt = data["prompt"]
    system_prompt = (
        data["system_prompt"] if "system_prompt" in data else DEFAULT_SYSTEM_PROMPT
    )
    return StreamingResponse(
        chat_model.generate_text(prompt, system_prompt),
        media_type="text/plain",
        headers={
            "Access-Control-Allow-Origin": "*",  # Allow CORS
        },
    )
