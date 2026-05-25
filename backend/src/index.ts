import 'dotenv/config';
import app from './app';

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`성공히히히allcle backend running on http://localhost:${PORT}`);
});
