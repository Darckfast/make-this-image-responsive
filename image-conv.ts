interface ImageArgs {
    img: ImageBitmap
    blur?: number
    maxSize?: number
    format?: "png" | "jpeg" | "webp"
    quality?: number
    id?: string
    cancel?: boolean
}

let queue: Array<ImageArgs> = []
let isProcessing = false

self.onmessage = function(e: MessageEvent<ImageArgs>) {
    if (e.data.cancel) {
        queue = []
    } else {
        queue.push(e.data)
        consumeQueue()
    }
}

function consumeQueue() {
    if (isProcessing) {
        return
    }

    isProcessing = true

    const args = queue.shift()

    if (!args) {
        isProcessing = false
        return
    }

    return genPreviewImg(args)
        .then(blob => {
            self.postMessage({
                blob,
                id: args.id,
            })
        }).finally(() => {
            isProcessing = false
            consumeQueue()
        })
}

function genPreviewImg(args: ImageArgs) {
    const canvas = new OffscreenCanvas(1, 1)
    const ctx = canvas.getContext("2d")!;

    // @ts-ignore
    ctx.mozImageSmoothingEnabled = false;
    // @ts-ignore
    ctx.webkitImageSmoothingEnabled = false;
    // @ts-ignore
    ctx.msImageSmoothingEnabled = false;
    ctx.imageSmoothingEnabled = false;

    let oH = Number(args.img.height)
    let oW = Number(args.img.width)

    let MAX_WIDTH = args.maxSize || 1000;
    let MAX_HEIGHT = args.maxSize || 1000;

    // TODO: add keep aspect ratio pots
    if (args.img.width < MAX_WIDTH) {
        MAX_WIDTH = oW
    }

    if (args.img.height < MAX_HEIGHT) {
        MAX_HEIGHT = oH
    }

    if (oW < oH) {
        if (oW > MAX_WIDTH) {
            oH = oH * (MAX_WIDTH / oW);
            oW = MAX_WIDTH;
        }
    } else {
        if (oH > MAX_HEIGHT) {
            oW = oW * (MAX_HEIGHT / oH);
            oH = MAX_HEIGHT;
        }
    }

    const larger = MAX_WIDTH > MAX_HEIGHT ? MAX_HEIGHT : MAX_WIDTH
    canvas.width = larger
    canvas.height = larger
    ctx.save()

    const canvasWidth = canvas.width;
    const blurRadius = canvasWidth * (args.blur || 0);
    ctx.filter = `blur(${blurRadius}px)`

    ctx.drawImage(args.img, -(oW - canvas.width) / 2, -(oH - canvas.height) / 2, oW, oH);
    ctx.restore()

    return canvas.convertToBlob({
        type: `image/${args.format}`,
        quality: args.quality || 95
    })
}
