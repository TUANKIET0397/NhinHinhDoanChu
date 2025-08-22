class SiteController {
    // [GET]
    index(req, res) {
        const playerName = req.query.playerName
        res.render("player", { playerName })
    }
}

// export the instance of NewsController - xuất ra ngoài
module.exports = new SiteController()
