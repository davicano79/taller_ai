import { Job, JobStatus, AppSettings } from '../types';

const SHEET_NAME = 'TallerProData';

// Helper to format a Job object into a row array for Google Sheets
const jobToRow = (job: Job): any[] => {
  return [
    job.id,
    new Date(job.createdAt).toISOString(),
    job.status,
    job.carDetails?.plate || '',
    job.carDetails?.make || '',
    job.carDetails?.model || '',
    job.repairType,
    (job.identifiedParts || []).join(', '),
    job.manualNotes || '',
    // IMPORTANT: We send empty JSON arrays for images because Base64 strings 
    // exceed the Google Sheets cell limit of 50,000 characters.
    // Images will be persisted in LocalStorage only.
    JSON.stringify([]), 
    JSON.stringify([])
  ];
};

// Helper to parse a row array from Google Sheets back into a Job object
const rowToJob = (row: any[]): Job => {
  const id = row[0] || '';
  const dateStr = row[1] || new Date().toISOString();
  const status = row[2] as JobStatus || JobStatus.INTAKE;
  const plate = row[3] || '';
  const make = row[4] || '';
  const model = row[5] || '';
  const repairType = row[6] as any || 'AMBOS';
  const partsStr = row[7] || '';
  const notes = row[8] || '';
  
  // We still attempt to parse, in case small images were saved previously
  const intakeJson = row[9] || '[]';
  const damageJson = row[10] || '[]';

  let intakeImage = undefined;
  let damageImages: string[] = [];

  try {
    const parsedIntake = JSON.parse(intakeJson);
    if (Array.isArray(parsedIntake) && parsedIntake.length > 0) intakeImage = parsedIntake[0];
    
    const parsedDamage = JSON.parse(damageJson);
    if (Array.isArray(parsedDamage)) damageImages = parsedDamage;
  } catch (e) {
    // console.warn("Error parsing image JSON from sheet", e);
  }

  return {
    id,
    createdAt: new Date(dateStr).getTime(),
    status,
    carDetails: {
      plate,
      make,
      model
    },
    repairType,
    identifiedParts: partsStr ? partsStr.split(', ') : [],
    manualNotes: notes,
    intakeImage,
    damageImages
  };
};

// Check if the sheet exists, create it if not, and add headers
export const ensureSheetExists = async (settings: AppSettings): Promise<void> => {
    const BASE_URL = `https://sheets.googleapis.com/v4/spreadsheets/${settings.googleSheetId}`;
    const token = settings.googleAccessToken;

    // 1. Get Spreadsheet Metadata to list sheets
    const metaRes = await fetch(`${BASE_URL}?fields=sheets.properties.title&access_token=${token}`);
    
    if (!metaRes.ok) {
        if (metaRes.status === 401 || metaRes.status === 403) {
            throw new Error("Permiso denegado. Revisa el Access Token.");
        }
        if (metaRes.status === 404) {
            throw new Error("Hoja de cálculo no encontrada. Revisa el ID.");
        }
        throw new Error("Error conectando con Google Sheets.");
    }

    const metaData = await metaRes.json();
    const sheetExists = metaData.sheets?.some((s: any) => s.properties.title === SHEET_NAME);

    if (sheetExists) {
        return; // All good
    }

    // 2. Create the Sheet if it doesn't exist
    const addSheetBody = {
        requests: [{
            addSheet: {
                properties: { title: SHEET_NAME }
            }
        }]
    };

    const createRes = await fetch(`${BASE_URL}:batchUpdate?access_token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addSheetBody)
    });

    if (!createRes.ok) throw new Error("No se pudo crear la pestaña 'TallerProData'.");

    // 3. Add Headers
    const headers = ["ID", "Fecha", "Estado", "Matrícula", "Marca", "Modelo", "Tipo Reparación", "Piezas", "Observaciones", "Imagen Ingreso (JSON)", "Imágenes Daños (JSON)"];
    const headerBody = {
        range: `${SHEET_NAME}!A1`,
        majorDimension: "ROWS",
        values: [headers]
    };

    await fetch(`${BASE_URL}/values/${SHEET_NAME}!A1:append?valueInputOption=USER_ENTERED&access_token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(headerBody)
    });
};

export const syncWithGoogleSheets = async (localJobs: Job[], settings: AppSettings): Promise<Job[]> => {
  if (!settings.googleSheetId || !settings.googleAccessToken) {
    throw new Error("Configuración incompleta");
  }

  const BASE_URL = `https://sheets.googleapis.com/v4/spreadsheets/${settings.googleSheetId}`;

  // Ensure structure exists before reading/writing
  await ensureSheetExists(settings);

  // 1. FETCH EXISTING DATA FROM SHEET (The "Database" - mostly text data)
  let sheetJobs: Job[] = [];
  try {
    const response = await fetch(`${BASE_URL}/values/${SHEET_NAME}!A2:K?access_token=${settings.googleAccessToken}`);
    if (response.ok) {
      const data = await response.json();
      if (data.values) {
        sheetJobs = data.values.map((row: any[]) => rowToJob(row));
      }
    }
  } catch (e) {
    console.error("Error reading from sheet", e);
  }

  // 2. MERGE STRATEGY
  const jobMap = new Map<string, Job>();
  
  // Start with Sheet data (Server Truth)
  sheetJobs.forEach(job => {
    if (job.id) jobMap.set(job.id, job);
  });

  // Overlay Local Data (Client Truth)
  // We prioritize Local Data because it likely contains the Images which we can't store in Sheet.
  localJobs.forEach(localJob => {
    if (localJob.id) {
      const sheetJob = jobMap.get(localJob.id);
      
      if (sheetJob) {
        // MERGE:
        // Take text data from local (it's likely the most recent edit).
        // CRITICAL: Ensure we preserve the images from localJob if they exist,
        // because sheetJob will likely have empty images due to the 50k limit fix.
        jobMap.set(localJob.id, {
           ...sheetJob, // Properties from sheet
           ...localJob, // Overwrite with local properties (includes images)
           // Double check to ensure we don't accidentally overwrite valid local images with empty sheet ones
           intakeImage: localJob.intakeImage || sheetJob.intakeImage,
           damageImages: (localJob.damageImages && localJob.damageImages.length > 0) 
              ? localJob.damageImages 
              : sheetJob.damageImages
        });
      } else {
        // New job created locally that hasn't synced yet
        jobMap.set(localJob.id, localJob);
      }
    }
  });

  const mergedJobs = Array.from(jobMap.values()).sort((a, b) => b.createdAt - a.createdAt);

  // 3. WRITE BACK TO SHEET (Overwrite everything for consistency)
  // This cleans up the sheet.
  const clearBody = { range: `${SHEET_NAME}!A2:K1000` };
  await fetch(`${BASE_URL}/values/${SHEET_NAME}!A2:K1000:clear?access_token=${settings.googleAccessToken}`, {
    method: 'POST',
    body: JSON.stringify(clearBody)
  });

  // Convert to rows (Images will be stripped here by jobToRow)
  const rows = mergedJobs.map(jobToRow);
  const writeBody = {
    range: `${SHEET_NAME}!A2`,
    majorDimension: "ROWS",
    values: rows
  };

  const writeResponse = await fetch(`${BASE_URL}/values/${SHEET_NAME}!A2:append?valueInputOption=USER_ENTERED&access_token=${settings.googleAccessToken}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(writeBody)
  });

  if (!writeResponse.ok) {
      const err = await writeResponse.json();
      throw new Error(`Error escribiendo en Sheet: ${err.error?.message || 'Unknown error'}`);
  }

  return mergedJobs;
};