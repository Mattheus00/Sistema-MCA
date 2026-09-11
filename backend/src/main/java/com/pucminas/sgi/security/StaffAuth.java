package com.pucminas.sgi.security;

/**
 * Expressões {@code @PreAuthorize} alinhadas à whitelist atual de {@code StaffAccessService}.
 */
public final class StaffAuth {

    public static final String FINANCEIRO =
            "hasAnyRole('PROPRIETARIA', 'RESPONSAVEL_FINANCEIRO')";

    public static final String STAFF =
            "hasAnyRole('PROPRIETARIA', 'RESPONSAVEL_FINANCEIRO', 'FUNCIONARIO')";

    private StaffAuth() {
    }
}
