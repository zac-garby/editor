class Editor {
    constructor(elemID, options = {}) {
        this.root = document.getElementById(elemID)
        this.root.contentEditable = true
        this.root.spellcheck = false
        this.root.autocapitalize = false
        this.root.ariaAutoComplete = false
        this.root.classList.add("editor")

        this.root.addEventListener("keydown", this.onkeydown.bind(this))
        this.root.addEventListener("input", this.oninput.bind(this))
        this.root.addEventListener("focus", this.onfocus.bind(this))
        this.root.addEventListener("mousedown", this.onmousedown.bind(this))
        this.root.addEventListener("paste", this.onpaste.bind(this))

        this.tokenizer = options.tokenizer || Editor.defaultTokenizer

        this.options = {
            singleLine: options.singleLine || false,
            height: options.height
        }

        if (this.options.singleLine) {
            this.root.classList.add("single-line")
        }

        if (this.options.height && !this.options.singleLine) {
            this.root.style.height = this.options.height + "px"
        }

        var firstLine = document.createElement("div")
        firstLine.className = "line"
        this.root.appendChild(firstLine)

        this.currentLine = firstLine
        this.sel = { row: 0, col: 0 }
    }

    getLines() {
        var nodes = this.root.childNodes
        var list = []

        for (var node of nodes) {
            if (node.tagName == "DIV") {
                list.push(node)
            }
        }

        return list
    }

    lineIndex(line) {
        var lines = this.getLines()

        for (var i = 0; i < lines.length; i++) {
            if (line.isSameNode(lines[i])) {
                return i
            }
        }

        return -1
    }

    getText() {
        var text = this.getLines().reduce((acc, el) => acc + el.textContent + "\n", "")
        return text.substring(0, text.length - 1)
    }

    updateCurrentLine() {
        var prev = this.currentLine

        var node = getSelection().anchorNode
        if (node == null) {
            this.currentLine = null
            return prev == null
        }

        while (node.tagName != "DIV" || node.parentNode != this.root || !node.classList || !node.classList.contains("line")) {
            if (node == null) {
                this.currentLine = null
                return prev == null
            }

            node = node.parentNode

            if (node == null) {
                this.currentLine = null
                return prev == null
            }
        }

        this.currentLine = node

        this.updateSelection()
    }

    possibleFocusChange(callback = null) {
        var lines = this.getLines()
        if (lines.length == 0) {
            var line = document.createElement("div")
            line.className = "line"
            this.root.appendChild(line)
            this.currentLine = line
        }

        window.setTimeout(() => {
            this.updateCurrentLine()

            this.getLines().forEach(el => el.classList.remove("current"))

            if (this.currentLine) {
                this.currentLine.classList.add("current")
            }

            if (callback) callback()
        }, 0)
    }

    updateSelection() {
        if (this.currentLine == null) {
            this.sel = null
            document.getElementById("info").textContent = "row: ?   col: ?"
            return
        }

        this.sel = {}

        var selectedToken = getSelection().anchorNode.parentNode
        var lines = this.getLines()

        for (var row = 0; row < lines.length; row++) {
            var line = lines[row]
            var foundRow = false

            if (selectedToken.parentNode == line || selectedToken == line || getSelection().anchorNode == line) {
                // found the selected row
                this.sel.row = row
                foundRow = true
            }

            var col = 0
            for (var tok of line.childNodes) {
                if (tok == selectedToken) {
                    col += getSelection().anchorOffset

                    document.querySelectorAll("pre.tok.current").forEach(tok => tok.classList.remove("current"))
                    tok.classList.add("current")

                    break
                } else {
                    col += tok.textContent.length
                }
            }

            this.sel.col = col

            if (foundRow) {
                break
            }
        }

        document.getElementById("info").textContent = "row: " + this.sel.row + "   col: " + this.sel.col
    }

    retokenize(line = this.currentLine) {
        var toks = this.tokenizer(line.textContent)

        if (!toks) {
            line.classList.add("invalid")
            return
        }

        line.classList.remove("invalid")

        // remove any non-tokens (these will be text nodes). they'll be recreated
        // when the new tokens are created next
        for (var el of line.childNodes) {
            if (el.nodeType == Node.TEXT_NODE) {
                el.remove()
            }
        }

        var head = line.firstChild
        var col = 0
        
        for (var tok of toks) {
            while (head && head.tagName != "SPAN") {
                var oldHead = head
                head = head.nextSibling
                oldHead.remove()
            }

            if (!head) {
                var el = this.makeToken(tok.type, tok.source)
                line.appendChild(el)

                if (this.sel.col >= col && this.sel.col <= col + tok.source.length) {
                    getSelection().setPosition(el.firstChild, this.sel.col - col)
                }
            } else if (head.getAttribute("type") != tok.type || head.innerHTML != tok.source) {
                if (this.sel.col >= col && this.sel.col <= col + tok.source.length) {
                    head.setAttribute("type", tok.type)
                    head.textContent = tok.source

                    getSelection().setPosition(head.firstChild, this.sel.col - col)

                    head = head.nextSibling
                } else {
                    head.setAttribute("type", tok.type)
                    head.textContent = tok.source
                    head = head.nextSibling
                }
            } else {
                if (this.sel.col >= col && this.sel.col <= col + tok.source.length) {
                    getSelection().setPosition(head.firstChild, this.sel.col - col)
                }

                head = head.nextSibling
            }

            col += tok.source.length
        }

        // clear all remaining tokens
        // TODO: this occurs when a token is deleted. that causes all subsequent token elements
        // to be updated to sort of "shift" them back. really, it would be more efficient to just
        // detect this and delete the token element itself.
        while (head) {
            var next = head.nextSibling
            if (head.textContent) head.remove()
            head = next
        }

        setTimeout(this.updateSelection.bind(this), 0)
    }

    makeToken(type, source) {
        var el = document.createElement("PRE")
        el.className = "tok"
        el.setAttribute("type", type)
        el.textContent = source
        return el
    }

    onkeydown(event) {
        if (event.isComposing ||
            event.keyCode === 229) {
            return
        }


        switch (event.key) {
            case "Enter":
                if (this.options.singleLine) {
                    event.preventDefault()
                }

                break
            
            case "Backspace":
                if (this.sel.col == 0 && this.sel.row == 0) {
                    event.preventDefault()
                }
                break
        }

        this.possibleFocusChange()
    }

    onfocus(event) {
        this.possibleFocusChange()
    }

    onmousedown(event) {
        this.possibleFocusChange()
    }

    oninput(event) {
        this.possibleFocusChange(this.retokenize.bind(this))
    }

    onpaste(event) {
        this.possibleFocusChange(this.retokenize.bind(this))
        var text = event.clipboardData.getData("text/plain")

        if (document.queryCommandSupported("insertText")) {
            document.execCommand("insertText", false, text)
        } else {
            document.execCommand("paste", false, text)
        }

        event.preventDefault()
    }

    static defaultTokenizer(line) {
        return [{ "type": "default", "source": line }]
    }
}
