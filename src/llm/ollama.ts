import { LLMProvider } from "./llm.interface";
import { LLMMessage, LLMResponse } from "./llm.types";
import { Ollama } from "ollama";

export class OllamaLLMProvider extends LLMProvider {
  private _client: Ollama;

  constructor(host: string, _apiKey: string) {
    super();
    this._client = new Ollama({ host });
  }

  public async sendChat(
    model: string,
    messages: LLMMessage[]
  ): Promise<LLMResponse> {
    const response = await this._client.chat({
      model,
      messages,
      stream: false,
      think: false,
      options: {
        temperature: 0.2,
        num_ctx: 8192,
      },
    });

    return { content: response.message.content };
  }

  public async sendChatWithJsonSchema(
    model: string,
    messages: LLMMessage[],
    schema: any
  ): Promise<any> {
    const response = await this._client.chat({
      model,
      messages,
      stream: false,
      think: false,
      format: schema,
      options: {
        temperature: 0.2,
        num_ctx: 8192,
      },
    });

    return { content: response.message.content };
  }
}
