import { Injectable } from '@nestjs/common';
import { ElevenLabsInputDto } from './dtos/requests/eleven-labs-input';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import FormData from 'form-data';
import { dictionary } from 'cmu-pronouncing-dictionary'
//import ESpeakNg from "espeak-ng";
const espeak = require('espeak-ng');
import { phonemize, toIPA, toARPABET } from 'phonemize'

@Injectable()
export class IntegrationsService {
  constructor(private readonly httpService: HttpService) {}

  async convertToVoice(data: ElevenLabsInputDto): Promise<any> {
    const voice = await firstValueFrom(
      this.httpService.post(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
        text: 'TESTWORD',
        model_id: MODEL,
  //       "pronunciation_dictionary_locators": [
  //   {
  //     "pronunciation_dictionary_id": "vdZtlC6kg5ZHNmmCSNwU",
  //     "version_id": "pQbd59SSnCVrB4upjVXw"
  //   }
  // ]
      }, {
        headers: {
          'xi-api-key': `${ELEVEN_API_KEY}`,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
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

 alpabetToIPA(text: string[]): string {
  const arpabetToIPA: Record<string, string> = {
    "AA": "ɑ","AE": "æ","AH": "ə","AO": "ɔ","AW": "aʊ","AY": "aɪ",
    "EH": "ɛ","ER": "ɝ","EY": "eɪ","IH": "ɪ","IY": "iː",
    "OW": "oʊ","OY": "ɔɪ","UH": "ʊ","UW": "uː",
    "P":"p","B":"b","T":"t","D":"d","K":"k","G":"ɡ",
    "CH":"tʃ","JH":"dʒ","F":"f","V":"v","TH":"θ","DH":"ð",
    "S":"s","Z":"z","SH":"ʃ","ZH":"ʒ","HH":"h",
    "M":"m","N":"n","NG":"ŋ","L":"l","R":"ɹ","Y":"j","W":"w"
  };

  const vowels = ["AA","AE","AH","AO","AW","AY","EH","ER","EY","IH","IY","OW","OY","UH","UW"];
  const words: string[][] = [];
  let currentWord: string[] = [];

  // Split flat array into words at "|"
  text.forEach(p => {
    if (p === "|") {
      if (currentWord.length) words.push(currentWord);
      currentWord = [];
    } else {
      currentWord.push(p);
    }
  });
  if (currentWord.length) words.push(currentWord);

  return words.map(word => {
    let ipa = '';
    let stressAdded = false;

    word.forEach((p, i) => {
      const match = p.match(/^([A-Z]+)([0-2]?)$/);
      if (!match) return;
      const [_, phoneme, stress] = match;

      if (!stressAdded && stress === '1') {
        ipa += 'ˈ';
        stressAdded = true;
      }

      const ipaPhoneme = arpabetToIPA[phoneme] || phoneme;

      // Add syllable dot before vowels except start/stress marker
      if (vowels.includes(phoneme) && i > 0 && !ipa.endsWith('ˈ') && !ipa.endsWith('.')) {
        ipa += '.';
      }

      ipa += ipaPhoneme;
    });

    return ipa;
  }).join(' ');
}

  textToPhonemes(text: string) {
  const letterToPhoneme: Record<string, string[]> = {
    A: ['EY'], B: ['B'], C: ['K'], D: ['D'], E: ['IY'], F: ['F'], G: ['G'],
    H: ['HH'], I: ['AY'], J: ['JH'], K: ['K'], L: ['L'], M: ['M'], N: ['N'],
    O: ['OW'], P: ['P'], Q: ['K','Y'], R: ['R'], S: ['S'], T: ['T'], U: ['Y','UW'],
    V: ['V'], W: ['W'], X: ['K','S'], Y: ['Y'], Z: ['Z']
  };

  // Remove punctuation and split into words
  const words = text.replace(/[^\w\s]/g, "").split(/\s+/);

  const phonemeArray = words.map(word => {
    const lower = word.toLowerCase();

    if (dictionary[lower]) {
      // CMU pronunciation exists
      return dictionary[lower];
    } else {
      // Fallback: map each letter to its phoneme
      return word.toUpperCase().split("").map(l => {
        const phon = letterToPhoneme[l];
        if (!phon) return [l]; // fallback to the letter itself if not found
        return phon;
      }).flat();
    }
  });

  return phonemeArray.flat();
}

  async convertToText(file: Express.Multer.File): Promise<any> {
    // Build form-data request
    const formData = new FormData();

    formData.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });

    formData.append('model_id', MODEL);

    // const response = await firstValueFrom(
    //   this.httpService.post('https://api.elevenlabs.io/v1/speech-to-text', formData, {
    //     headers: {
    //       'xi-api-key': ELEVEN_API_KEY,
    //       ...formData.getHeaders(), // 👈 important
    //     },
    //     maxBodyLength: Infinity, // handle larger uploads
    //   }),
    // );

    // const phonemes = this.textToPhonemes('LizandVi.');
    // //`const phenoms = espeak.say('hello', { phoneme: true });
    // //const phonemes1 = dictionary[response.data?.text];
    // const ipa = this.alpabetToIPA(phonemes);

    // console.log(phonemes.join(' '));
    // console.log(ipa);
    return { phonemes: phonemize('Mc-kay-bree') };
  }

}