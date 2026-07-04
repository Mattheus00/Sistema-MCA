package com.pucminas.sgi.enums;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@DisplayName("StatusDivida")
class StatusDividaTest {

    @Test
    @DisplayName("valueOf retorna enum pelo nome")
    void valueOf() {
        assertEquals(StatusDivida.EM_ABERTO, StatusDivida.valueOf("EM_ABERTO"));
        assertEquals(StatusDivida.PARCIAL, StatusDivida.valueOf("PARCIAL"));
        assertEquals(StatusDivida.QUITADA, StatusDivida.valueOf("QUITADA"));
        assertEquals(StatusDivida.VENCIDA, StatusDivida.valueOf("VENCIDA"));
        assertEquals(StatusDivida.CANCELADA, StatusDivida.valueOf("CANCELADA"));
    }

    @Test
    @DisplayName("values retorna todos os status")
    void values() {
        StatusDivida[] values = StatusDivida.values();
        assertNotNull(values);
        assertEquals(5, values.length);
    }

    @Test
    @DisplayName("emAberto retorna EM_ABERTO, PARCIAL e VENCIDA")
    void emAberto() {
        List<StatusDivida> abertos = StatusDivida.emAberto();
        assertEquals(3, abertos.size());
        assertTrue(abertos.contains(StatusDivida.EM_ABERTO));
        assertTrue(abertos.contains(StatusDivida.PARCIAL));
        assertTrue(abertos.contains(StatusDivida.VENCIDA));
    }
}
