package com.pucminas.sgi.repository;

import com.pucminas.sgi.entity.Cliente;
import com.pucminas.sgi.enums.StatusCliente;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repositório JPA para a entidade Cliente.
 */
@Repository
public interface ClienteRepository extends JpaRepository<Cliente, UUID>, JpaSpecificationExecutor<Cliente> {

    Optional<Cliente> findByCpfCnpj(String cpfCnpj);

    @Query("""
            SELECT c FROM Cliente c
            WHERE REPLACE(REPLACE(REPLACE(REPLACE(c.cpfCnpj, '.', ''), '-', ''), '/', ''), ' ', '') = :digitos
            """)
    Optional<Cliente> findByCpfCnpjDigitos(@Param("digitos") String digitos);

    Optional<Cliente> findByCodigo(String codigo);

    Page<Cliente> findByStatusCliente(StatusCliente status, Pageable pageable);

    List<Cliente> findByStatusCliente(StatusCliente status);

    Page<Cliente> findByNomeContainingIgnoreCase(String nome, Pageable pageable);

    Page<Cliente> findByNomeContainingIgnoreCaseAndStatusCliente(String nome, StatusCliente status, Pageable pageable);

    Page<Cliente> findByStatusClienteNot(StatusCliente status, Pageable pageable);

    Page<Cliente> findByNomeContainingIgnoreCaseAndStatusClienteNot(String nome, StatusCliente status, Pageable pageable);

    List<Cliente> findTop10ByOrderBySaldoDevedorDesc();
}
