import ImageConv from './image-conv.ts?worker';

const worker = new ImageConv()
const form = document.getElementById('form')!
const previewContainer = document.getElementById('preview')!

worker.onmessage = function(e) {
    const preview = document.getElementById(e.data.id)
    if (!preview) {
        return;
    }

    const url = URL.createObjectURL(e.data.blob);

    if (preview.src) {
        URL.revokeObjectURL(preview.src);
    }

    preview.src = url;
};

form.onchange = () => {
    const formData = new FormData(form)
    worker.postMessage({ cancel: true })

    const preview = document.createElement("img")

    const img = formData.get("img")

    preview.width = 500
    preview.id = "preview-result"
    previewContainer.appendChild(preview)

    createImageBitmap(img).then(bitmap => {
        worker.postMessage({
            img: bitmap,
            id: preview.id,
            blur: formData.get('blur'),
            maxSize: formData.get('size'),
            keepAspectRatio: formData.get("ratio"),
            format: formData.get('format'),
            quality: formData.get('quality')
        });
    })
}

