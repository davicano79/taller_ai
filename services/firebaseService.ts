import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, writeBatch, Firestore } from 'firebase/firestore';
import { Job, AppSettings, FirebaseConfig } from '../types';

let app: FirebaseApp | undefined;
let db: Firestore | undefined;

const COLLECTION_NAME = 'jobs';

const getDb = (config: FirebaseConfig): Firestore => {
  if (!getApps().length) {
    app = initializeApp(config);
  } else {
    app = getApp();
  }
  if (!db) {
    db = getFirestore(app);
  }
  return db;
};

// --- IMAGE COMPRESSION UTILS ---

// Compress an image base64 string to a smaller size/quality for Firestore storage
const compressImage = (base64: string, maxWidth: number = 800, quality: number = 0.6): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = `data:image/jpeg;base64,${base64}`;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Calculate new dimensions
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64); // Fail gracefully, return original
        return;
      }

      // Fill white background to handle transparency issues if any
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.drawImage(img, 0, 0, width, height);

      // Export as compressed JPEG
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(dataUrl.split(',')[1]);
    };
    img.onerror = (err) => resolve(base64); // Fail gracefully
  });
};

// Process a job to compress all its images before sending to cloud
const prepareJobForCloud = async (job: Job): Promise<Job> => {
  // Clone job to avoid mutating local state
  const jobToSave = { ...job };

  // 1. Compress Intake Image
  if (jobToSave.intakeImage) {
    try {
      jobToSave.intakeImage = await compressImage(jobToSave.intakeImage);
    } catch (e) {
      console.warn("Failed to compress intake image", e);
    }
  }

  // 2. Compress Damage Images
  if (jobToSave.damageImages && jobToSave.damageImages.length > 0) {
    try {
      const compressedImages = await Promise.all(
        jobToSave.damageImages.map(img => compressImage(img))
      );
      jobToSave.damageImages = compressedImages;
    } catch (e) {
      console.warn("Failed to compress damage images", e);
    }
  }

  return jobToSave;
};

// --- SYNC LOGIC ---

export const syncWithFirebase = async (localJobs: Job[], settings: AppSettings): Promise<Job[]> => {
  if (!settings.firebaseConfig || !settings.firebaseConfig.apiKey) {
    throw new Error("Configuración de Firebase incompleta.");
  }

  const database = getDb(settings.firebaseConfig);
  const jobsRef = collection(database, COLLECTION_NAME);

  // 1. FETCH Remote Data
  const snapshot = await getDocs(jobsRef);
  const remoteJobs: Job[] = [];
  
  snapshot.forEach((doc) => {
    remoteJobs.push(doc.data() as Job);
  });

  // 2. MERGE Strategy
  const jobMap = new Map<string, Job>();

  // Start with Remote (Server Truth)
  remoteJobs.forEach(rJob => {
    jobMap.set(rJob.id, rJob);
  });

  // Overlay Local
  localJobs.forEach(lJob => {
    const rJob = jobMap.get(lJob.id);
    
    if (rJob) {
      // Merge logic:
      // If local has high-res images (recently taken), keep them locally?
      // But for syncing purposes, we usually trust the "Server" version for older data,
      // and "Local" version for data we just edited.
      
      // Simplest approach: Trust Local for everything active, but respect Remote if local is missing data.
      jobMap.set(lJob.id, {
        ...rJob, 
        ...lJob, // Local overwrites remote fields if conflict
        // Ensure images are preserved from whichever source has them
        intakeImage: lJob.intakeImage || rJob.intakeImage,
        damageImages: (lJob.damageImages && lJob.damageImages.length > 0) ? lJob.damageImages : rJob.damageImages
      });
    } else {
      // New local job not yet in cloud
      jobMap.set(lJob.id, lJob);
    }
  });

  const mergedJobs = Array.from(jobMap.values()).sort((a, b) => b.createdAt - a.createdAt);

  // 3. WRITE UPDATES TO CLOUD
  // We prepare (compress) images before writing.
  const batch = writeBatch(database);
  let opCount = 0;

  // We need to handle async compression for the loop, so we can't use simple forEach inside batch logic easily without Promise.all
  // Let's filter which jobs actually need saving (optimally), but for now we save all to ensure sync.
  
  // Limit: Firestore batch is 500 ops. We'll cap at 450 for safety.
  const jobsToSave = mergedJobs.slice(0, 450); // Safety limit for this demo structure

  for (const job of jobsToSave) {
    const docRef = doc(database, COLLECTION_NAME, job.id);
    
    // Compress images before uploading
    const dataToSave = await prepareJobForCloud(job);

    // SANITIZE: Remove undefined values because Firestore throws error "Unsupported field value: undefined"
    // JSON.stringify removes undefined keys, JSON.parse brings it back to object.
    const cleanData = JSON.parse(JSON.stringify(dataToSave));

    batch.set(docRef, cleanData, { merge: true });
    opCount++;
  }

  if (opCount > 0) {
    await batch.commit();
  }

  return mergedJobs;
};
