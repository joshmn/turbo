export function append(element, content) {
    element.append(content)
}

export function prepend(element, content) {
    element.prepend(content)
}

export function replace(element, content) {
    element.replaceWith(content)
}

export function update(element, content) {
    element.innerHTML = ""
    element.append(content)
}

export function remove(element) {
    element.remove()
}
