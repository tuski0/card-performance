package app.cardperf

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class NoticeFilterTest {
    @Test fun paymentTextsAreRecognised() {
        assertTrue(NoticeFilter.looksLikePayment("KB국민카드 5351 승인\n5,000원 일시불"))
        assertTrue(NoticeFilter.looksLikePayment("토스뱅크 체크카드 12,000원 결제"))
        assertTrue(NoticeFilter.looksLikePayment("승인취소 5,000원 CU"))
    }

    @Test fun nonPaymentTextsAreRejected() {
        assertFalse(NoticeFilter.looksLikePayment("이번 주 혜택을 확인하세요"))
        assertFalse(NoticeFilter.looksLikePayment("카톡: 내일 3시에 봐"))
        assertFalse(NoticeFilter.looksLikePayment("택배가 도착했어요 (1,000원 착불)"))
    }

    @Test fun keyIsStableAndSensitiveToEveryPart() {
        val base = NoticeFilter.keyOf("a", "k", 1L, "x")
        assertEquals(base, NoticeFilter.keyOf("a", "k", 1L, "x"))
        assertEquals(64, base.length)
        assertNotEquals(base, NoticeFilter.keyOf("b", "k", 1L, "x"))
        assertNotEquals(base, NoticeFilter.keyOf("a", "j", 1L, "x"))
        assertNotEquals(base, NoticeFilter.keyOf("a", "k", 2L, "x"))
        assertNotEquals(base, NoticeFilter.keyOf("a", "k", 1L, "y"))
    }

    @Test fun safeTakeDoesNotSplitSurrogatePairs() {
        val s = "ab\uD83D\uDE00cd"
        assertEquals("ab", NoticeFilter.safeTake(s, 3))
        assertEquals("ab\uD83D\uDE00", NoticeFilter.safeTake(s, 4))
        assertEquals(s, NoticeFilter.safeTake(s, 10))
    }

    @Test fun keyFieldsCannotBeShiftedAcrossSeparators() {
        assertNotEquals(NoticeFilter.keyOf("a|b", "c", 1L, "x"), NoticeFilter.keyOf("a", "b|c", 1L, "x"))
    }

    @Test fun allowlistChecks() {
        assertFalse(NoticeFilter.isAllowedSource("com.kakao.talk", DEFAULT_ALLOWED))
        assertTrue(NoticeFilter.isAllowedSource("com.kbcard.cxh.appcard", DEFAULT_ALLOWED))
        assertTrue(NoticeFilter.isAllowedSource("viva.republica.toss", DEFAULT_ALLOWED))
    }

    @Test fun kakaoPaymentLookalikeIsNotForwarded() {
        assertFalse(NoticeFilter.shouldForward("com.kakao.talk", "5,000원 결제했어", DEFAULT_ALLOWED))
    }

    @Test fun allowedPaymentIsForwarded() {
        assertTrue(NoticeFilter.shouldForward("com.kbcard.cxh.appcard", "KB국민카드 승인\n5,000원 일시불", DEFAULT_ALLOWED))
        assertFalse(NoticeFilter.shouldForward("com.kbcard.cxh.appcard", "이번 주 혜택", DEFAULT_ALLOWED))
    }
}
