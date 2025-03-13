import { uploadDocs } from '../app/lib/uploadDocs';

console.log('Starting Checkout.com documentation upload...');
uploadDocs()
  .then(() => {
    console.log('Upload completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Upload failed:', error);
    process.exit(1);
  }); 