package com.pucminas.sgi.service;

import com.pucminas.sgi.exception.BusinessRuleException;
import com.pucminas.sgi.security.EnvioBoletoAccessService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LoteEnvioBoletoServiceTest {

    @Mock EnvioBoletoAccessService accessService;
    @InjectMocks LoteEnvioBoletoService service;

    @Test
    void criarLoteSemArquivosFalha() {
        UUID usuarioId = UUID.randomUUID();
        when(accessService.assertPodeGerenciarBoletos(usuarioId)).thenReturn(null);

        assertThatThrownBy(() -> service.criarLote(usuarioId, List.of()))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("ao menos um arquivo");
    }
}
