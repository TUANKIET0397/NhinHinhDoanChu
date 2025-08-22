//Database
console.log("Oke socket")
const { sequelize, connect } = require("../config/db/db.js")
connect() // Gọi hàm kết nối DB
const PlayerModel = require("../app/models/Player.js")(sequelize)

let drawHistory = []
let guessHistory = []
let players = [] // [{id, name, score, isCorrect}]
let currentDrawerIndex = 0
let currentWord = ""
let gameStarted = false

// ==========================
// Export hàm nhận io từ ngoài vào
// ==========================
module.exports = (io) => {
    io.on("connection", (socket) => {
        console.log("New user connected:", socket.id)

        socket.on("joinGame", async (playerName) => {
            if (!playerName || playerName.trim() === "") {
                console.log("❌ Invalid player name")
                return
            }

            // Kiểm tra player đã tồn tại chưa
            const existingPlayer = players.find((p) => p.id === socket.id)
            if (existingPlayer) {
                console.log("Player already exists:", socket.id)
                return
            }

            let playerScore = 0

            // Kiểm tra player đã từng chơi chưa (dựa trên tên)
            try {
                const existingDbPlayer = await PlayerModel.findOne({
                    where: { player_name: playerName.trim() },
                })

                if (existingDbPlayer) {
                    playerScore = existingDbPlayer.score || 0
                    console.log(
                        `Returning player ${playerName} with score: ${playerScore}`
                    )

                    // Update socket_id mới
                    await PlayerModel.update(
                        { socket_id: socket.id },
                        { where: { player_name: playerName.trim() } }
                    )
                }
            } catch (error) {
                console.error("❌ Error checking existing player:", error)
            }

            const newPlayer = {
                id: socket.id,
                name: playerName.trim(),
                score: playerScore,
                role: "guesser",
                isCorrect: false,
            }

            players.push(newPlayer)
            updatePlayers(io)

            // Save vào DB
            try {
                const [player, created] = await PlayerModel.findOrCreate({
                    where: { player_name: newPlayer.name },
                    defaults: {
                        socket_id: newPlayer.id,
                        player_name: newPlayer.name,
                        score: newPlayer.score,
                    },
                })

                if (!created) {
                    await player.update({ socket_id: newPlayer.id })
                }
            } catch (err) {
                console.error("❌ Error saving player to DB:", err.message)
            }

            // Logic start game
            if (players.length >= 2 && !gameStarted) {
                gameStarted = true
                startTurn(io) // bắt đầu lượt đầu tiên
            } else if (players.length >= 2 && gameStarted) {
                socket.emit("role", "guesser")
                socket.emit("startGame")

                const currentDrawer = players[currentDrawerIndex]
                if (currentDrawer) {
                    socket.emit("updateCurrentDrawer", {
                        id: currentDrawer.id,
                        name:
                            currentDrawer.name ||
                            currentDrawer.player_name ||
                            currentDrawer.id.slice(0, 5),
                    })
                }
            } else {
                socket.emit("waiting", "Waiting for others...")
            }
        })

        // Gửi dữ liệu cho người mới
        socket.emit("init", {
            drawHistory,
            guessHistory,
        })

        // Drawing
        socket.on("drawing", (data) => {
            drawHistory.push(data)
            socket.broadcast.emit("drawing", data)
        })

        // Guess
        socket.on("guess", async (text) => {
            const player = players.find((p) => p.id === socket.id)
            const playerName = player ? player.name : socket.id.slice(0, 5)

            const guess = { username: playerName, guess: text }
            guessHistory.push(guess)
            io.emit("guess", guess)

            if (
                text.trim().toLowerCase() ===
                    currentWord.trim().toLowerCase() &&
                socket.id !== players[currentDrawerIndex].id
            ) {
                const winner = players.find((p) => p.id === socket.id)
                if (winner) {
                    winner.score += 10
                    winner.isCorrect = true

                    try {
                        await PlayerModel.update(
                            { score: winner.score },
                            { where: { socket_id: winner.id } }
                        )
                    } catch (error) {
                        console.error("❌ Error updating score in DB:", error)
                    }

                    updatePlayers(io)
                }

                io.emit("stopTimer")

                setTimeout(() => {
                    nextTurn(io)
                }, 3000)
            }
        })

        socket.on("requestWordOptions", async () => {
            const [rows] = await sequelize.query(
                "SELECT keyword FROM Keywords ORDER BY RAND() LIMIT 2"
            )
            const wordOptions = rows.map((r) => r.keyword)
            socket.emit("chooseWordOptions", wordOptions)
        })

        socket.on("skipDrawing", () => {
            io.emit("stopTimer")
            nextTurn(io)
        })

        socket.on("selectedWord", (word) => {
            currentWord = word
            const drawer = players[currentDrawerIndex]

            io.emit("startRound")
            io.to(drawer.id).emit("startDrawing")
            socket.broadcast.emit("otherPlayerDrawing")
        })

        socket.on("timeUp", () => {
            nextTurn(io)
        })

        socket.on("clearImg", () => {
            const player = players.find((p) => p.id === socket.id)
            if (player && player.role === "drawer") {
                io.emit("clear")
            }
        })

        socket.on("disconnect", async () => {
            console.log("❌ User disconnected:", socket.id)
            const wasDrawer = socket.id === players[currentDrawerIndex]?.id

            const playerToRemove = players.find((p) => p.id === socket.id)
            if (playerToRemove) {
                players = players.filter((p) => p.id !== socket.id)
                updatePlayers(io)

                await removePlayerFromDB(playerToRemove.id)

                if (players.length < 2) {
                    io.emit("waiting", "Waiting for other players...")
                    currentDrawerIndex = 0
                    io.emit("clearCanvas")
                    gameStarted = false
                    return
                }

                if (wasDrawer) {
                    if (currentDrawerIndex >= players.length) {
                        currentDrawerIndex = 0
                    }
                    nextTurn(io)
                }
            }
        })
    })
}

// =====================
// Các function hỗ trợ
// =====================
function updatePlayers(io) {
    const currentDrawer = players[currentDrawerIndex]

    io.emit(
        "updatePlayers",
        players.map((p) => ({
            id: p.id,
            name: p.name || p.player_name || p.id.slice(0, 5),
            score: p.score || 0,
            role: p.role || "guesser",
            isCorrect: p.isCorrect || false,
        }))
    )

    if (currentDrawer && players.length >= 2) {
        const drawerInfo = {
            id: currentDrawer.id,
            name:
                currentDrawer.name ||
                currentDrawer.player_name ||
                currentDrawer.id.slice(0, 5),
        }
        io.emit("updateCurrentDrawer", drawerInfo)
    }
}

async function chooseWord() {
    try {
        const [rows] = await sequelize.query(
            "SELECT keyword FROM Keywords ORDER BY RAND() LIMIT 1"
        )
        return rows[0].keyword
    } catch (error) {
        console.error("Error choosing word:", error)
        return null
    }
}

async function startTurn(io) {
    if (players.length < 2) return

    players.forEach((p) => {
        p.role = "guesser"
        p.isCorrect = false
    })

    players[currentDrawerIndex].role = "drawer"
    const drawer = players[currentDrawerIndex]

    updatePlayers(io)

    io.emit("newTurnStarted", {
        currentDrawer: {
            id: drawer.id,
            name: drawer.name || drawer.player_name || drawer.id.slice(0, 5),
        },
    })

    players.forEach((p, index) => {
        io.to(p.id).emit(
            "role",
            index === currentDrawerIndex ? "drawer" : "guesser"
        )
    })

    drawHistory = []
    guessHistory = []
    io.emit("clearCanvas")
}

async function nextTurn(io) {
    if (players.length < 2) return

    const currentDrawer = players[currentDrawerIndex]
    const hasCorrectGuess = players.some((p) => p.isCorrect)

    if (hasCorrectGuess && currentDrawer) {
        currentDrawer.score += 5
        try {
            await PlayerModel.update(
                { score: currentDrawer.score },
                { where: { socket_id: currentDrawer.id } }
            )
        } catch (error) {
            console.error("❌ Error updating drawer score in DB:", error)
        }
    }

    currentDrawerIndex = (currentDrawerIndex + 1) % players.length
    currentWord = await chooseWord()

    players.forEach((p) => {
        p.role = "guesser"
        p.isCorrect = false
    })

    players[currentDrawerIndex].role = "drawer"
    const newDrawer = players[currentDrawerIndex]

    updatePlayers(io)

    io.emit("newTurnStarted", {
        currentDrawer: {
            id: newDrawer.id,
            name:
                newDrawer.name ||
                newDrawer.player_name ||
                newDrawer.id.slice(0, 5),
        },
    })

    players.forEach((p, index) => {
        if (index === currentDrawerIndex) {
            io.to(p.id).emit("role", "drawer")
            io.to(p.id).emit("yourTurnToDraw", currentWord)
        } else {
            io.to(p.id).emit("role", "guesser")
        }
    })

    drawHistory = []
    guessHistory = []

    io.emit("clearCanvas")
    io.emit("startGame")
}

async function removePlayerFromDB(socketId) {
    try {
        await PlayerModel.destroy({ where: { socket_id: socketId } })
        console.log(`Player with socket_id=${socketId} removed from DB`)
    } catch (error) {
        console.error("Error removing player from DB:", error)
    }
}
