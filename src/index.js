const qr = require('qr-image');
const pngLib = require('qr-image/lib/png');

export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);

		if (request.method === 'POST') {
			return generateQRCode(await request.json());
		} else if (request.method === 'GET' && url.searchParams.has('text')) {
			const text = url.searchParams.get('text');
			const size = url.searchParams.get('size');
			const margin = url.searchParams.get('margin');
			return generateQRCode({ text, size, margin });
		}

		return new Response(landing, {
			headers: {
				'Content-Type': 'text/html',
			},
		});
	},
};

async function generateQRCode({ text, size, margin }) {
	const headers = { 'Content-Type': 'image/png' };
	let exactSize = null;
	let marginVal = 4; // default for png in qr-image
    
	if (size && !isNaN(parseInt(size))) {
		exactSize = parseInt(size);
	}
	if (margin && !isNaN(parseInt(margin))) {
		marginVal = parseInt(margin);
	}

	let buffer;

	if (exactSize !== null) {
		const matrix = qr.matrix(text || 'NULL');
		const N = matrix.length;
		const num_modules = N + 2 * marginVal;
		const X = exactSize;
		const data = Buffer.alloc((X + 1) * X);
		data.fill(255);
		for (let i = 0; i < X; i++) {
			data[i * (X + 1)] = 0;
		}
		for (let y = 0; y < X; y++) {
			for (let x = 0; x < X; x++) {
				const module_x = Math.floor(x * num_modules / X) - marginVal;
				const module_y = Math.floor(y * num_modules / X) - marginVal;
				if (module_x >= 0 && module_x < N && module_y >= 0 && module_y < N && matrix[module_x][module_y]) {
					data[y * (X + 1) + x + 1] = 0;
				}
			}
		}
		const stream = [];
		pngLib.png({ data, size: X }, stream);
		buffer = Buffer.concat(stream.filter(Boolean));
	} else {
		const options = { margin: marginVal };
		buffer = qr.imageSync(text || 'NULL', options);
	}

	return new Response(buffer, { headers });
}

const landing = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>QR Code Generator</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background-color: #f0f0f0;
        }
        .container {
            text-align: center;
            background-color: #ffffff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            max-width: 400px;
            width: 90%;
        }
        h1 {
            color: #333333;
        }
        input[type="text"] {
            width: 100%;
            padding: 10px;
            margin: 10px 0;
            box-sizing: border-box;
            font-size: 16px;
            border: 1px solid #ccc;
            border-radius: 4px;
        }
        button {
            background-color: #4CAF50;
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
        }
        button:hover {
            background-color: #45a049;
        }
        #qr {
            display: none; /* Initially hide the QR code image */
            margin-top: 20px;
            max-width: 100%;
            margin-left: auto;
            margin-right: auto;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>QR Code Generator</h1>
        <input type="text" id="text" placeholder="Enter text or URL" value="">
        <button onclick="generate()">Generate QR Code</button>
        <div id="qr-container">
            <img id="qr" src="#" alt="Generated QR Code">
        </div>
    </div>
    <script>
        function generate() {
            const text = document.querySelector("#text").value.trim();
            if (text !== "") {
                fetch(window.location.pathname, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text: text })
                })
                .then(response => response.blob())
                .then(blob => {
                    const reader = new FileReader();
                    reader.onloadend = function () {
                        document.querySelector("#qr").src = reader.result;
                        document.querySelector("#qr").style.display = "inline-block"; // Show the QR code image
                    }
                    reader.readAsDataURL(blob);
                })
                .catch(error => console.error('Error generating QR code:', error));
            } else {
                alert("Please enter text or URL to generate QR code.");
            }
        }
    </script>
</body>
</html>
`;
