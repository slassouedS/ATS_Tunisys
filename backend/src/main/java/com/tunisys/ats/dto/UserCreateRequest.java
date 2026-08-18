package com.tunisys.ats.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record UserCreateRequest(
        @NotBlank @Email String email,
        @NotBlank String password,
        @NotBlank String firstName,
        @NotBlank String lastName,
        @NotBlank String roleCode,   // MANAGER, RH, RECRUTEUR, TECH, ADMIN
        Long departmentId
) {}
