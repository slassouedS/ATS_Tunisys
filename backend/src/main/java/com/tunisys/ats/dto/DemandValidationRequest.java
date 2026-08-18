package com.tunisys.ats.dto;

import jakarta.validation.constraints.NotNull;

public record DemandValidationRequest(
        @NotNull Boolean approve,
        String rejectionReason
) {}
