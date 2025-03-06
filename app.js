import express from "express";
import axios from "axios";
import qs from "qs";
import fs from 'fs'

const app = express()
const port = 3333

// Definindo as variáveis necessárias para a autenticação com a API do Spotify
const CLIENT_ID = "ec0cf881ba7a417a9b0ac4eeab1ae133";
const CLIENT_SECRET = "e0583cc8df354474aa38458682624d3d";
const REDIRECT_URI = "http://localhost:3333/auth/callback";

let playlistData = null;
let accessToken = null;
let finalPlaylist = null;

const authURL = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=user-read-private%20user-read-email`;
console.log("Acesse este link para logar no Spotify:", authURL);

app.get('/', (req, res) => {
    res.status(200).send({ login: authURL });
})

//  capturar o código que o Spotify retorna e trocar pelo token de acesso
app.get("/auth/callback", async (req, res) => {
    const code = req.query.code; // pega o código da URL que o Spotify envia 

    if (!code) { // se não tiver código, retorna 400
        return res.status(400).send("Código não encontrado.");
    }

    try {// Enviamos uma requisição POST para o Spotify, para trocar o código pelo token de acesso

        const response = await axios.post(
            "https://accounts.spotify.com/api/token",  // URL do endpoint que troca o código pelo token
            qs.stringify({  // Usamos o qs.stringify para formatar os dados em x-www-form-urlencoded
                grant_type: "authorization_code",  // Tipo de grant, para indicar que estamos usando o código de autorização
                code: code,                        // O código recebido na URL após o login
                redirect_uri: REDIRECT_URI,
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET
            }),
            {
                headers: { "Content-Type": "application/x-www-form-urlencoded" }  // Definindo o tipo de conteúdo da requisição
            }
        );

        // Se a requisição deu boa, o Spotify nos envia o token de acesso
        accessToken = response.data.access_token;
        console.log("Token de acesso:", accessToken);
        res.send("Deu boa, Agora você pode acessar a rota `/f`.");
    } catch (error) {
        console.error("Erro ao trocar código pelo token:", error.response?.data || error.message);
        res.status(500).send("Erro ao obter token.");
    }
});


// Função para buscar todas as músicas da playlist
async function fetchAllTracks(playlistId) {
    let allTracks = [];
    let offset = 0;
    const limit = 100;

    try {
        while (true) {
            const response = await axios.get(
                `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=${limit}&offset=${offset}`,
                {
                    headers: { Authorization: `Bearer ${accessToken}` },
                }
            );

            const tracks = response.data.items;

            if (tracks.length === 0) {
                break; // Se não houver mais faixas, saímos do loop
            }

            allTracks = allTracks.concat(tracks);
            offset += limit; // Aumentamos o offset para pegar a próxima leva de músicas
        }

        return allTracks;
    } catch (error) {
        console.error("Erro ao buscar músicas da playlist:", error.response?.data || error.message);
        return [];
    }
}


app.get('/f', async (req, res) => {
    if (!accessToken) {
        return res.status(401).send("Não autenticado, faça o login")
    }

    const playlistId = "47xyDY5YH364bnQLOYTjqc"; // f(x)

    // Solicitação para pegar a playlist
    try {
        // Buscar todas as faixas da playlist
        const tracks = await fetchAllTracks(playlistId);

        // Formatando apenas nome da música e artista
        const formattedTracks = tracks.map((item) => ({
            name: item.track.name,
            artists: item.track.artists.map((artist) => artist.name),
        }));

        res.json({ total: formattedTracks.length, tracks: formattedTracks });
        // finalPlaylist = formattedTracks
        const jsonData = JSON.stringify(formattedTracks, null, 2); // O "2" deixa formatado bonito
        fs.writeFileSync("playlist.txt", jsonData, "utf8");
        } catch (error) {
        console.error("Erro ao buscar a playlist:", error.response?.data || error.message);
        res.status(500).send("Erro ao buscar a playlist.");
    }
});

app.listen(port, () => {
    console.log("subiu a pipa do vovô");
})
