import 'dotenv/config';
import path from 'node:path';
export const config = {
  port: Number(process.env.PORT || 3001),
  dataDir: path.resolve(process.env.DATA_DIR || 'data'),
  datasetPath: path.resolve(process.env.DATASET_PATH || 'dataset/hotel_bookings.csv'),
};
export const rawFile = process.env.RAW_DATA_PATH
  ? path.resolve(process.env.RAW_DATA_PATH)
  : path.join(config.dataDir, 'raw_data.xlsx');
