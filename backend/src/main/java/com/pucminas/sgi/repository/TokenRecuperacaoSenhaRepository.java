package com.pucminas.sgi.repository;

import com.pucminas.sgi.entity.TokenRecuperacaoSenha;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

public interface TokenRecuperacaoSenhaRepository extends JpaRepository<TokenRecuperacaoSenha, UUID> {
    @EntityGraph(attributePaths = "usuario")
    Optional<TokenRecuperacaoSenha> findByTokenHash(String tokenHash);

    // Compare-and-set no banco: duas requisições não podem consumir o mesmo token.
    @Modifying(flushAutomatically = true)
    @Query("update TokenRecuperacaoSenha t set t.usadoEm = :agora "
            + "where t.id = :id and t.usadoEm is null and t.expiraEm > :agora")
    int consumirSeValido(@Param("id") UUID id, @Param("agora") LocalDateTime agora);
}
