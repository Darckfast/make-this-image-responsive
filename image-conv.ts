interface ImageArgs {
    img: ImageBitmap
    maxSize: number
    blur?: number
    format?: "png" | "jpeg" | "webp"
    quality?: number
    keepAspectRatio?: boolean
    meta?: any
    cancel?: boolean
    overlays?: Array<{
        img: ImageBitmap
        height: number
        width: number
        position: "top-left" | "top-right" |
        "bottom-left" | "bottom-right" | "center"
    }>
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
                meta: args.meta,
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

    let MAX_WIDTH = Number(args.maxSize);
    let MAX_HEIGHT = Number(args.maxSize);

    if (oW < MAX_WIDTH) {
        MAX_WIDTH = oW
    }

    if (oH < MAX_HEIGHT) {
        MAX_HEIGHT = oH
    }


    let x0 = 0, y0 = 0
    if (args.keepAspectRatio) {
        if (oW < oH) {
            const ratio = oW / oH
            oW = MAX_WIDTH * ratio
            oH = MAX_HEIGHT
        } else {
            const ratio = oH / oW
            oW = MAX_WIDTH
            oH = MAX_HEIGHT * ratio
        }
        canvas.width = oW
        canvas.height = oH
    } else {
        const larger = MAX_WIDTH > MAX_HEIGHT ? MAX_HEIGHT : MAX_WIDTH
        canvas.width = larger
        canvas.height = larger

        if (oW < oH && oW > MAX_WIDTH) {
            oH = oH * (MAX_WIDTH / oW);
            oW = MAX_WIDTH;

        } else if (oH > MAX_HEIGHT) {
            oW = oW * (MAX_HEIGHT / oH);
            oH = MAX_HEIGHT;
        }

        x0 = -(oW - canvas.width) / 2
        y0 = -(oH - canvas.height) / 2
    }

    ctx.save()

    if (args.blur) {
        const blurRatio = (canvas.width / oW) * Number(args.blur || 0)
        ctx.filter = `blur(${blurRatio}px)`
    }

    ctx.drawImage(args.img, x0, y0, oW, oH);
    ctx.restore()

    if (args.overlays) {
        for (let i = 0; i < args.overlays.length; i++) {
            const overlay = args.overlays[i]

            if (overlay.img) {
                let ovX = 0, ovY = 0

                const ovH = overlay.height * oH
                const ovW = overlay.width * oW
                if (overlay.position === "top-right") {
                    ovX = oW - ovW
                } else if (overlay.position === "bottom-left") {
                    ovY = canvas.height - ovH
                } else if (overlay.position === "bottom-right") {
                    ovX = canvas.width - ovW
                    ovY = canvas.height - ovH
                } else if (overlay.position === "center") {
                    ovX = canvas.width / 2 - ovW / 2
                    ovY = canvas.height / 2 - ovH / 2
                }

                console.log(x0, y0, oW, oH, ovX, ovY, ovW, ovH)
                ctx.drawImage(overlay.img, ovX, ovY, ovW, ovH)
            }
        }
    }

    return canvas.convertToBlob({
        type: `image/${args.format}`,
        quality: args.quality || 95
    })
}
