import { processPageUpdates } from "page-updater"

const MIME_TYPE = "text/html; page-update"

addEventListener("turbolinks:before-fetch-request", acceptPageUpdates)
addEventListener("turbolinks:before-fetch-response", handlePageUpdates)

function acceptPageUpdates(event) {
    const { headers } = event.data.fetchOptions
    headers.Accept = [ MIME_TYPE, headers.Accept ].join(", ")
}

function handlePageUpdates(event) {
    const { fetchResponse } = event.data
    if (fetchResponse.contentType?.includes(MIME_TYPE)) {
        event.preventDefault()
        fetchResponse.responseHTML.then(processPageUpdates)
    }
}
