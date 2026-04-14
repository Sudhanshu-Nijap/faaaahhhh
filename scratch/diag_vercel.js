const axios = require('axios');
(async () => {
    try {
        const res = await axios.get('https://hackx2-0.vercel.app', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
            }
        });
        console.log('Status:', res.status);
        console.log('Headers:', res.headers);
        console.log('Content Length:', res.data.length);
    } catch (e) {
        console.error('Error:', e.message);
        if (e.response) {
            console.error('Response Status:', e.response.status);
            console.error('Response Body Snippet:', e.response.data.substring(0, 200));
        }
    }
})();
