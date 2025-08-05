// Importar librerías necesarias 

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const ytdl = require('ytdl-core');
const fs = require('fs');
const path = require('path');

const client = new Client({
    authStrategy: new LocalAuth()
});


client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('Cliente de WhatsApp listo!');
});

// ver mensajes
client.on('message', async message => {
    const chat = await message.getChat();
    const sender = message.from; // Número del remitente

    // Comando
    if (message.body.startsWith('.descargaryt ')) {
        const youtubeUrl = message.body.substring('.descargaryt '.length).trim();

        // Validar si es una URL de YouTube válida
        if (!ytdl.validateURL(youtubeUrl)) {
            return client.sendMessage(sender, 'Por favor, introduce una URL de YouTube válida.');
        }

        try {
           
            await client.sendMessage(sender, '🔄 Empezando a descargar el video. Esto puede tardar unos minutos...');

            // Obtener info del video
            const info = await ytdl.getInfo(youtubeUrl);
            const videoTitle = info.videoDetails.title.replace(/[^a-zA-Z0-9 ]/g, "").substring(0, 50); // Limpiar y acortar título
            const outputPath = path.join(__dirname, `${videoTitle}.mp4`);

            ytdl(youtubeUrl, {
                quality: 'highestaudio' // Puedes ajustar la calidad, 'highest' para video y audio
            })
                .pipe(fs.createWriteStream(outputPath))
                .on('finish', async () => {
                    console.log(`Video descargado: ${outputPath}`);
                    // IMPORTANTE: WhatsApp tiene límites de tamaño de archivo. Videos grandes fallarán.
                    try {
                        await chat.sendFile(outputPath, {
                            caption: `¡Aquí tienes tu video: ${videoTitle}!`
                        });
                        console.log('Video enviado con éxito.');
                    } catch (sendError) {
                        console.error('Error al enviar el video', sendError);
                        await client.sendMessage(sender, '⚠️ Lo siento, no pude enviar el video. Podría ser demasiado grande o hubo un error al enviarlo.');
                    } finally {
                        // Eliminar el archivo después de enviarlo para no acumular espacio
                        fs.unlink(outputPath, (err) => {
                            if (err) console.error('Error al eliminar el archivo temporal:', err);
                        });
                    }
                })
                .on('error', async (err) => {
                    console.error('Error al descargar el video:', err);
                    await client.sendMessage(sender, '❌ ¡Ups! No pude descargar ese video. Asegúrate de que el enlace sea correcto y el video esté disponible.');
                });

        } catch (error) {
            console.error('Error general en el proceso de descarga:', error);
            await client.sendMessage(sender, 'Hubo un error inesperado. Inténtalo de nuevo más tarde.');
        }
    }
});

client.initialize();
