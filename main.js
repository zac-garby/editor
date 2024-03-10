var editor

function onload() {
    singleLine = new Editor("singleLine", {
        // tokenizer: tokenize,
        singleLine: true
    })

    editor = new Editor('editor', {
        tokenizer: tokenize,
        height: 500,
    })
}

function tokenize(line) {
    var tokens = []
    var i = 0

    while (i < line.length) {
        var start = line.charAt(i)
        var remaining = line.substring(i)
        var j = i + 1
        var type = undefined
        var sourceOverride = undefined

        var kw = remaining.match(/^(let|in|do|case|of|if|then|else)/)

        if (kw) {
            type = "kw"
            j += kw[0].length
        } else if (start.match(/\s/)) {
            type = "space"
            while (line.charAt(j).match(/\s/)) j++
        } else if (start.match(/\d/)) {
            type = "num"
            while (line.charAt(j).match(/\d/)) j++
        } else if (start.match(/[_'a-zA-Z]/)) {
            type = "id"
            while (line.charAt(j).match(/[_'a-zA-Z0-9]/)) j++
        } else if (start.match(/[\+\-\*\/()\[\]!=\<\>~.,\:]/)) {
            type = "sym"
            while (line.charAt(j).match(/[\+\-\*\/()\[\]!=\<\>~.,\:]/)) j++
        } else if (start == '"') {
            type = "str"

            while (line.charAt(j) != '"') {
                j++
                if (j >= line.length) {
                    type = "unknown"
                    break
                }
            }

            j++
        } else if (start == "{") {
            type = "hole"

            while (line.charAt(j) != "}") {
                j++
                if (j >= line.length) {
                    type = "unknown"
                    break
                }
            }

            j++
        } else if (start == "?") {
            type = "hole"
            sourceOverride = "{ }"
        } else {
            type = "unknown"
            j++
        }

        tokens.push({
            "type": type || "unknown",
            "source": sourceOverride || line.substring(i, j),
        })

        i = j
    }

    return tokens
}