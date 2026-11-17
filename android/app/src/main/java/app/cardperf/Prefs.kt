package app.cardperf

import android.content.Context
import android.content.SharedPreferences

/** SharedPreferences "card": ingest token and recently-seen notification keys (max 50). */
class Prefs(context: Context) {
    private val sp: SharedPreferences =
        context.applicationContext.getSharedPreferences("card", Context.MODE_PRIVATE)

    var token: String?
        get() = sp.getString("token", null)?.takeIf { it.isNotEmpty() }
        set(value) {
            sp.edit().apply {
                if (value.isNullOrEmpty()) remove("token") else putString("token", value)
            }.apply()
        }

    var recentKeys: List<String>
        get() = sp.getString("recentKeys", "")!!.split('\n').filter { it.isNotEmpty() }
        set(value) {
            sp.edit().putString("recentKeys", value.takeLast(MAX_KEYS).joinToString("\n")).apply()
        }

    /** Packages whose notifications may be read. Others are never inspected. */
    var allowedPackages: Set<String>
        get() = sp.getStringSet("allowedPackages", null)?.toSet() ?: DEFAULT_ALLOWED
        set(value) {
            sp.edit().putStringSet("allowedPackages", value.toSet()).apply()
        }

    companion object {
        const val MAX_KEYS = 50
    }
}
