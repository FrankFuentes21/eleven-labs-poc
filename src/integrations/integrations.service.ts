import { Injectable } from '@nestjs/common';
import { ElevenLabsInputDto } from './dtos/requests/eleven-labs-input';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { ConfigService } from '@nestjs/config';
import { phonemize } from 'phonemize'
import FormData from 'form-data';

@Injectable()
export class IntegrationsService {
  constructor(private readonly httpService: HttpService, private readonly configService: ConfigService) { }

  getFormattedFileName() {
    const now = new Date();

    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = now.getFullYear();

    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");

    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;

    return `speech-${day}-${month}-${year}@${hours}:${minutes}:${seconds}${ampm}`;
  }

  async convertToVoice(data: ElevenLabsInputDto): Promise<any> {
    const ELEVEN_LABS_API_KEY = this.configService.get<string>('ELEVEN_LABS_API_KEY');
    const VOICE_ID = this.configService.get<string>('VOICE_ID');
    const TTS_MODEL = this.configService.get<string>('TTS_MODEL');
    const PRONUNCIATION_DICTIONARY_ID = this.configService.get<string>('PRONUNCIATION_DICTIONARY_ID');
    //const PRONUNCIATION_DICTIONARY_VERSION_ID = this.configService.get<string>('PRONUNCIATION_DICTIONARY_VERSION_ID');

    const voice = await firstValueFrom(
      this.httpService.post(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
        text: data.text,
        model_id: TTS_MODEL,
        pronunciation_dictionary_locators: [
          {
            pronunciation_dictionary_id: PRONUNCIATION_DICTIONARY_ID,
            //version_id: PRONUNCIATION_DICTIONARY_VERSION_ID
          }
        ]
      }, {
        headers: {
          'xi-api-key': `${ELEVEN_LABS_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        responseType: 'stream'
      }).pipe(
        catchError((error: AxiosError) => {
          console.log(error.response?.data)
          throw 'An error happened!';
        }),
      )
    )

    return voice.data
  }

  async saveToDictionary(phonemes: any[]): Promise<any> {
    const ELEVEN_LABS_API_KEY = this.configService.get<string>('ELEVEN_LABS_API_KEY');
    const PRONUNCIATION_DICTIONARY_ID = this.configService.get<string>('PRONUNCIATION_DICTIONARY_ID');

    const rules = phonemes.map(rule => ({
      string_to_replace: rule.word,
      //phoneme: rule.phoneme,
      type: "alias",
      //alphabet: "ipa",
      alias: rule.phoneme,
    }));

    const response = await firstValueFrom(
      this.httpService.post(`https://api.elevenlabs.io/v1/pronunciation-dictionaries/${PRONUNCIATION_DICTIONARY_ID}/add-rules`, {
        rules
      }, {
        headers: {
          'xi-api-key': ELEVEN_LABS_API_KEY,
          'Content-Type': 'application/json',
        }
      })
    );

    return response.data;
  }

  async convertToText(file: Express.Multer.File, phrase: string): Promise<any> {
    const ELEVEN_LABS_API_KEY = this.configService.get<string>('ELEVEN_LABS_API_KEY');
    const MODEL = this.configService.get<string>('STT_MODEL');

    // Build form-data request
    const formData = new FormData();

    formData.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });

    formData.append('model_id', MODEL);

    const response = await firstValueFrom(
      this.httpService.post('https://api.elevenlabs.io/v1/speech-to-text', formData, {
        headers: {
          'xi-api-key': ELEVEN_LABS_API_KEY,
          ...formData.getHeaders(),
        },
        maxBodyLength: Infinity,
      }),
    );

    const phoneme = phonemize(response.data.text);
    console.log({ phoneme, text: response.data.text, phrase });

    await this.saveToDictionary([{ word: phrase, phoneme: response.data.text }]);

    return this.convertToVoice({ text: response.data.text })
  }

}