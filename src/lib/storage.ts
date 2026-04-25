import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import app from './firebase';

export const storage = app ? getStorage(app) : null;

export async function uploadProfileImage(uid: string, file: File): Promise<string> {
  if (!storage) throw new Error('Firebase Storage not initialized');
  
  const ext = file.name.split('.').pop() || 'jpg';
  const fileName = `profiles/${uid}/avatar_${Date.now()}.${ext}`;
  const storageRef = ref(storage, fileName);
  
  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);
  return downloadURL;
}
