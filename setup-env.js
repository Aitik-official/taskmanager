const fs = require('fs');
const path = require('path');

// Create .env.local file
const envContent = `MONGODB_URI=mongodb+srv://ghodehimanshu453:6YeUjmeewSV9zpM5@cluster0.uo4qa7m.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
`;

const envPath = path.join(__dirname, '.env.local');

if (!fs.existsSync(envPath)) {
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Created .env.local file');
} else {
  console.log('⚠️ .env.local already exists');
}

console.log('🚀 Next.js migration setup complete!');
console.log('📝 Please run: npm install && npm run dev');
