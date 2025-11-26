import { toast } from "sonner";

export interface SeparationJob {
  job_id: string;
  status: 'processing' | 'completed' | 'failed' | 'not_found';
  separation_type: 'music' | 'speech';
  original_file?: string;
  output_files?: Array<{
    name: string;
    path: string;
    url: string;
  }>;
  error?: string;
}

// Update this path to match your backend output directory
const API_BASE_URL = 'http://localhost:5000';

// Configuration for output file paths - USING YOUR ABSOLUTE PATH
const OUTPUT_PATHS = {
  // Your absolute path with the specific folders
  BASE_PATH: 'D:\\SBE 2027\\DSP\\Audio Files',
  UPLOAD_FOLDER: 'Uploads',
  MUSIC_OUTPUT_FOLDER: 'Music Output', 
  SPEECH_OUTPUT_FOLDER: 'Speech Output'
};

export class AudioSeparationService {
  static async separateAudio(
    file: File, 
    type: 'music' | 'speech', 
    stems: number = 5
  ): Promise<SeparationJob> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    formData.append('stems', stems.toString());

    try {
      const response = await fetch(`${API_BASE_URL}/api/separate`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Separation failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Separation error:', error);
      throw error;
    }
  }

  static async getJobStatus(jobId: string): Promise<SeparationJob> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch job status');
      }

      return await response.json();
    } catch (error) {
      console.error('Status check error:', error);
      throw error;
    }
  }

  static async downloadFile(url: string): Promise<Blob> {
    try {
      // Fix the URL - remove any duplicate /api
      let fixedUrl = url;
      if (url.startsWith('/api/')) {
        fixedUrl = url; // Keep as is, we'll prepend API_BASE_URL
      }
      
      const fullUrl = `${API_BASE_URL}${fixedUrl}`;
      console.log('📥 Downloading from:', fullUrl);
      
      const response = await fetch(fullUrl);
      
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      }

      return await response.blob();
    } catch (error) {
      console.error('Download error:', error);
      throw error;
    }
  }

  static async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/health`);
      return response.ok;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  // Helper method to get expected output file names for 5-stem model
  static getExpectedStemNames(): string[] {
    return ['vocals', 'drums', 'bass', 'piano', 'guitar', 'other'];
  }
}

// Polling utility for job status
export const pollJobStatus = async (
  jobId: string, 
  onUpdate: (job: SeparationJob) => void,
  onComplete: (job: SeparationJob) => void,
  onError: (error: string) => void,
  interval: number = 2000,
  maxAttempts: number = 300 // 10 minute timeout
): Promise<void> => {
  let attempts = 0;

  const poll = async () => {
    try {
      const job = await AudioSeparationService.getJobStatus(jobId);
      onUpdate(job);

      if (job.status === 'completed') {
        onComplete(job);
        return;
      }

      if (job.status === 'failed') {
        onError(job.error || 'Separation failed');
        return;
      }

      attempts++;
      if (attempts >= maxAttempts) {
        onError('Separation timeout - process took too long');
        return;
      }

      // Continue polling
      setTimeout(poll, interval);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Polling error');
    }
  };

  await poll();
};