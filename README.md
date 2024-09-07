
## LongWriter: AI Smart Tool for Generating Long Texts

LongWriter is an advanced AI tool that utilizes Long Context LLMs (Language Models) to generate long texts of up to 10,000+ words. Whether you need to generate lengthy articles, essays, or reports, LongWriter has got you covered.

### Features

- **High-Quality Text Generation**: LongWriter leverages state-of-the-art language models to produce coherent and contextually relevant text.
- **Customizable Word Count**: Specify the desired word count for your generated text, ranging from a few hundred words to over 10,000 words.
- **Easy Integration**: LongWriter can be seamlessly integrated into your existing applications or workflows, making it a versatile tool for various use cases.

### Getting Started

To run LongWriter using Docker Compose and Docker, follow these steps:

1. Clone the repository:

  ```shell
  git clone https://github.com/george-mountain/longwriter-smart-ai-tool.git
  ```

2. Navigate to the project directory:

  ```shell
  cd longwriter-smart-ai-tool
  ```
Create a .env file in your project root directory and fill your configurations.
Example:
```shell



# MICROSERVICES PORTS
BACKEND_PORT=8000

# MICROSERVICES URL
FRONTEND_URL=http://127.0.0.1:5173
HOST_IP=<your server ip address>
VITE_API_BASE_URL=http://${HOST_IP}:${BACKEND_PORT}
REDIS_URL=redis://redis_server:${REDIS_PORT}



```

3. Build the Docker image:

  ```shell
  docker compose build
  ```

4. Start the application:

  ```shell
  docker compose up
  ```

5. Access LongWriter in your web browser at `http://localhost:5173`.

6. Access api docs via `http://localhost:8000/docs`



