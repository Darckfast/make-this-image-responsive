import ImageConv from './image-conv.ts?worker';

const worker = new ImageConv()
const form = document.getElementById('form')!
const previewContainer = document.getElementById('preview')!

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const value = parseFloat((bytes / Math.pow(k, i)).toFixed(dm));

    return `${value} ${sizes[i]}`;
}

worker.onmessage = function(e) {
    const preview = document.getElementById(e.data.meta.id)
    if (!preview) {
        return;
    }

    const url = URL.createObjectURL(e.data.blob);

    if (preview.src) {
        URL.revokeObjectURL(preview.src);
    }

    preview.src = url;
    const caption = document.getElementById('caption')

    let { meta, blob: { size } } = e.data
    caption.innerText = `o-size: ${formatBytes(meta.size)}; 
a-size: ${formatBytes(size)}; 
${(((size / meta.size) - 1) * 100).toFixed(2)}%; 
took: ${Date.now() - meta.start}ms;
quality: ${meta.quality};
blur: ${meta.blur};
resolution: ${meta.resolution};
aspect: ${meta.aspect}`
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
            meta: {
                id: preview.id,
                start: Date.now(),
                size: img.size,
                quality: formData.get('quality'),
                blur: formData.get('blur'),
                resolution: formData.get('size'),
                aspect: formData.get('ratio')
            },
            blur: formData.get('blur'),
            maxSize: formData.get('size'),
            keepAspectRatio: formData.get("ratio"),
            format: formData.get('format'),
            quality: formData.get('quality')
        });
    })
}

