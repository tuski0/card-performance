package app.cardperf

import java.net.URI

const val APP_HOST = "card-performance.vercel.app"

/** True only for https URLs whose host is exactly the web app's host. */
fun isAppUrl(url: String?): Boolean {
    if (url == null) return false
    val uri = try { URI(url) } catch (_: Exception) { return false }
    return uri.scheme == "https" && uri.host == APP_HOST && uri.userInfo == null
}

/** Schemes the external-link handler may launch. */
fun isLaunchableScheme(scheme: String?): Boolean =
    scheme == "http" || scheme == "https" || scheme == "mailto" || scheme == "tel"
