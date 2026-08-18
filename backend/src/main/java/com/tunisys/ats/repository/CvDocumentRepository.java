package com.tunisys.ats.repository;

import com.tunisys.ats.domain.CvDocument;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CvDocumentRepository extends JpaRepository<CvDocument, Long> {
}
