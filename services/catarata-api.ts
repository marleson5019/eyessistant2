import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

/**
 * Serviço para integração com API de detecção de catarata
 * 
 * Configurações:
 * - LOCAL: http://localhost:8000 (desenvolvimento)
 * - PROD: será definido via variável de ambiente
 */

// Use EXPO_PUBLIC_API_URL when definido (dev), senão usa o backend online publicado
const API_BASE_URL =
  (process.env && process.env.EXPO_PUBLIC_API_URL) ||
  'https://eyessistant2-backend.onrender.com';

export interface PredictionResult {
  prediction: 'normal' | 'catarata';
  confidence: number;
  class_index: number;
  message: string;
}

export interface ApiError {
  status: number;
  detail: string;
}

/**
 * Converte arquivo local (URI) para base64
 * Suporta web (FileReader) e nativo (expo-file-system)
 */
async function imageUriToBase64(imageUri: string): Promise<string> {
  try {
    // Se for web, usar Blob/FileReader
    if (Platform.OS === 'web') {
      return await imageUriToBase64Web(imageUri);
    }
    
    // Se for nativo, usar expo-file-system
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return base64;
  } catch (error) {
    throw new Error(`Erro ao converter imagem para base64: ${error}`);
  }
}

/**
 * Converte imagem para base64 em ambiente web (usando Fetch API)
 */
async function imageUriToBase64Web(imageUri: string): Promise<string> {
  try {
    // Se a URI é um arquivo do tipo blob:// ou data://
    if (imageUri.startsWith('blob:') || imageUri.startsWith('data:')) {
      // Fazer fetch da blob e converter para base64
      const response = await fetch(imageUri);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1]; // Remove "data:image/...;base64,"
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } else {
      // Tentar buscar como URL
      const response = await fetch(imageUri);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }
  } catch (error) {
    throw new Error(`Erro ao converter imagem web para base64: ${error}`);
  }
}

/**
 * Envia imagem para análise via base64 (método recomendado para React Native)
 */
export async function predictFromBase64(imageUri: string): Promise<PredictionResult> {
  try {
    const base64Image = await imageUriToBase64(imageUri);

    const response = await fetch(`${API_BASE_URL}/predict-base64`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: base64Image,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw {
        status: response.status,
        detail: error.detail || 'Erro desconhecido na API',
      } as ApiError;
    }

    const result: PredictionResult = await response.json();
    return result;
  } catch (error) {
    console.error('Erro na predição:', error);
    throw error;
  }
}

/**
 * Verifica se a API está disponível (health check)
 */
export async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
    });
    return response.ok;
  } catch (error) {
    console.warn('API indisponível:', error);
    return false;
  }
}

/**
 * Realiza predição com retry (em caso de falha temporária)
 */
export async function predictWithRetry(
  imageUri: string,
  maxRetries: number = 3
): Promise<PredictionResult> {
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Tentativa ${attempt}/${maxRetries}] Enviando imagem para análise...`);
      const result = await predictFromBase64(imageUri);
      console.log(`✅ Análise concluída: ${result.prediction}`);
      return result;
    } catch (error) {
      lastError = error;
      console.warn(`Tentativa ${attempt} falhou:`, error);

      // Aguarda antes de tentar novamente (com backoff exponencial)
      if (attempt < maxRetries) {
        const delay = 1000 * Math.pow(2, attempt - 1);
        console.log(`⏳ Aguardando ${delay}ms antes de tentar novamente...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Falha ao enviar para análise após múltiplas tentativas');
}

/**
 * Mapeia resultado da predição para mensagem em português
 */
export function getPredictionMessage(prediction: PredictionResult): string {
  const confidence = (prediction.confidence * 100).toFixed(1);
  
  if (prediction.prediction === 'normal') {
    return `✅ Nenhum sinal de catarata detectado\n${confidence}% de confiança`;
  } else {
    return `⚠️ Possível sinal de catarata detectado\nConfidência: ${confidence}%`;
  }
}

/**
 * Mapeia resultado para recomendação
 */
export function getRecommendation(prediction: PredictionResult, t?: (key: string) => string): string {
  if (t) {
    return prediction.prediction === 'normal' ? t('analise_recomendacao_normal') : t('analise_recomendacao_urgente');
  }

  // Fallback (Português) caso não haja função de tradução
  if (prediction.prediction === 'normal') {
    return 'Continue monitorando regularmente seus olhos com exames periódicos.';
  } else {
    return 'Recomendamos que você consulte um oftalmologista para uma avaliação mais detalhada.';
  }
}
