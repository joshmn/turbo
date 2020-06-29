export function parseHTMLFragment(html) {
    return createTemplateElement(html).content
}

export function createTemplateElement(html) {
    const template = document.createElement("template")
    template.innerHTML = html
    return template
}

export function nextFrame() {
    return new Promise(requestAnimationFrame)
}

export function scrollToElement(element, { behavior = "smooth", block = "start", inline = "nearest" } = {}) {
    element.scrollIntoView({ behavior, block, inline })
}
