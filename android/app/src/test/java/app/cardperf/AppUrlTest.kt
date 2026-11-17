package app.cardperf

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AppUrlTest {
    @Test fun appUrl() {
        assertTrue(isAppUrl("https://card-performance.vercel.app"))
        assertTrue(isAppUrl("https://card-performance.vercel.app/review?x=1"))
    }
    @Test fun http() = assertFalse(isAppUrl("http://card-performance.vercel.app/"))
    @Test fun subdomain() = assertFalse(isAppUrl("https://a.card-performance.vercel.app/"))
    @Test fun lookalike() = assertFalse(isAppUrl("https://card-performance.vercel.app.evil.com/"))
    @Test fun userinfo() = assertFalse(isAppUrl("https://card-performance.vercel.app@evil.com/"))
    @Test fun queryTrick() = assertFalse(isAppUrl("https://evil.com/?https://card-performance.vercel.app"))
    @Test fun nullUrl() = assertFalse(isAppUrl(null))
    @Test fun schemes() {
        assertTrue(isLaunchableScheme("mailto"))
        assertFalse(isLaunchableScheme("intent"))
        assertFalse(isLaunchableScheme(null))
    }
}
