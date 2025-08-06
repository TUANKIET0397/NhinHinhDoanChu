const canvas = document.querySelector("canvas"),
    toolBtns = document.querySelectorAll(".tool"),
    fillColor = document.querySelector("#fill-color"),
    sizeSlider = document.querySelector("#size-slider"),
    colorBtns = document.querySelectorAll(".colors .option"),
    colorPicker = document.querySelector("#color-picker"),
    clearCanvas = document.querySelector(".clear-canvas"),
    ctx = canvas.getContext("2d")

// global variables with default value
let prevMouseX,
    prevMouseY,
    snapshot,
    isDrawing = false,
    selectedTool = "brush",
    brushWidth = 5,
    selectedColor = "#000",
    timer

const setCanvasBackground = () => {
    ctx.fillStyle = "#fff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = selectedColor // setting fillstyle back to the selectedColor, it'll be the brush color
}

window.addEventListener("load", () => {
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight
    setCanvasBackground()
})

const startDraw = (e) => {
    isDrawing = true
    prevMouseX = e.offsetX // passing current mouseX position as prevMouseX value
    prevMouseY = e.offsetY // passing current mouseY position as prevMouseY value
    ctx.beginPath() // creating new path to draw
    ctx.lineWidth = brushWidth // passing brushSize as line width
    ctx.strokeStyle = selectedColor // passing selectedColor as stroke style
    ctx.fillStyle = selectedColor // passing selectedColor as fill style
    // copying canvas data & passing as snapshot value.. this avoids dragging the image
    snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height)
}

const drawing = (e) => {
    if (!isDrawing) return // if isDrawing is false return from here
    ctx.putImageData(snapshot, 0, 0) // adding copied canvas data on to this canvas

    if (selectedTool === "brush" || selectedTool === "eraser") {
        ctx.strokeStyle = selectedTool === "eraser" ? "#fff" : selectedColor
        ctx.lineTo(e.offsetX, e.offsetY) // creating line according to the mouse pointer
        ctx.stroke() // drawing/filling line with color
    }
}

toolBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
        document.querySelector(".options .active").classList.remove("active")
        btn.classList.add("active")
        selectedTool = btn.id
    })
})

sizeSlider.addEventListener("change", () => (brushWidth = sizeSlider.value))

colorBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
        document
            .querySelector(".options .selected")
            .classList.remove("selected")
        btn.classList.add("selected")
        selectedColor = window
            .getComputedStyle(btn)
            .getPropertyValue("background-color")
    })
})

colorPicker.addEventListener("change", () => {
    colorPicker.parentElement.style.background = colorPicker.value
    colorPicker.parentElement.click()
})

clearCanvas.addEventListener("click", () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height) // clearing whole canvas
    setCanvasBackground()
})

// saveImg.addEventListener("click", () => {
//     const link = document.createElement("a") // creating <a> element
//     link.download = `${Date.now()}.jpg` // passing current date as link download value
//     link.href = canvas.toDataURL() // passing canvasData as link href value
//     link.click() // clicking link to download image
// })

canvas.addEventListener("mousedown", startDraw)
canvas.addEventListener("mousemove", drawing)
canvas.addEventListener("mouseup", () => (isDrawing = false))

function setProgressBar(duration, barId, callback) {
    const fill = document.getElementById(barId)
    fill.style.transition = "none"
    fill.style.width = "100%"
    setTimeout(() => {
        fill.style.transition = `width ${duration}s linear`
        fill.style.width = "0%"
    }, 50)

    clearTimeout(timer)
    timer = setTimeout(callback, duration * 1000)
}

function handleChoice(choice) {
    if (choice === "draw") {
        document.getElementById("drawing-board__first").style.display = "none"
        document.getElementById("drawing-board__second").style.display = "flex"
        setProgressBar(10, "drawing-board__progress-fill", () => startDrawing())
    } else {
        // Nếu không vẽ, có thể thực hiện hành động khác
    }
}

function startDrawing() {
    document.getElementById("drawing-board__choice").style.display = "none"
    showCanvas()
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight
    setCanvasBackground()
}

function showCanvas() {
    document.getElementById("drawing-board__canvas").style.display = "block"
    setProgressBar(10, "drawing-board__canvas-fill", () => {
        document.getElementById("drawing-board__canvas").style.display = "none"
        document.getElementById("drawing-board__choice").style.display = "block"
        document.getElementById("drawing-board__first").style.display = "flex"
        document.getElementById("drawing-board__second").style.display = "none"
        setProgressBar(10, "drawing-board__progress-fill", () => startDrawing())
    })
}
window.onload = function () {
    setProgressBar(10, "drawing-board__progress-fill", () => startDrawing())
}
