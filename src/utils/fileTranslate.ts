import axios from 'axios';
import { TableItem } from '../types/TableItem';

export async function fileTranslate(fileContent: string, apiKey: string): Promise<TableItem[]> {
  if (fileContent) {
    const jsonData: Object = JSON.parse(fileContent);
    const sendData = dataFormat(jsonData);

    const translatedData = await translateData(sendData, apiKey);

    const aryData: TableItem[] = Object.entries(jsonData).map(([key, value]) => ({
      name: key,
      value: String(value),
      translatedValue: translatedData.get(key)
    }));

    return aryData;
  }

  return [];
}

async function translateData(data: { key: string, text: string }[][], apiKey: string): Promise<Map<string, string>> {
  try {
    const returnData = new Map<string, string>();
    for (const textsData of data) {
      await new Promise(resolve => setTimeout(resolve, 100));
      const texts = textsData.map((textData) => textData.text);
    
      const response = await axios.post('https://api-free.deepl.com/v2/translate', 
        {
          text: texts,
          source_lang: 'EN',
          target_lang: 'JA'
        },
        {
          headers: {
            'Authorization': `DeepL-Auth-Key ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
    
      response.data.translations.forEach((translation, i) => {
        const formatText = translation.text
          .replace(/(\S)<keep>/g, '$1 <keep>')
          .replace(/<\/keep>(\S)/g, '</keep> $1')
          .replace(/<\/?keep>/g, '')
          .replace(/\s+/g, ' ')
          .trim();
    
        returnData.set(textsData[i].key, formatText);
      });
    }
    return returnData;
  } catch (error) {
    console.error('Translation error:', error);
    return new Map<string, string>();  
    }
}

function dataFormat(data: Object): { key: string, text: string }[][] {
  const formatedData: {key: string, text: string}[][] = [[]];
  let currentIndex = 0;

  for (const [key, value] of Object.entries(data)) {
    if (formatedData[currentIndex].length >= 50) {
      currentIndex++;
      formatedData[currentIndex] = [];
    }
    const wrapText = String(value).replace(/(^%\S*)|(\s%\S*)/g, match => ` <keep> ${match.trim()} </keep> `).trim();
    formatedData[currentIndex].push({key, text: wrapText});
    
  }
  return formatedData;
}