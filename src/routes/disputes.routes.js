const express = require('express');
const router = express.Router();
const disputesService = require('../services/disputes.service').default;
const { authenticateJWT } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const upload = require('../middleware/upload').default;

/**
 * @route   GET /api/merchants/:merchantId/disputes
 * @desc    Get all disputes for a merchant
 * @access  Private (JWT)
 */
router.get(
  '/:merchantId/disputes',
  authenticateJWT,
  asyncHandler(async (req, res) => {
    const { merchantId } = req.params;
    const { status, reason, limit = 20, offset = 0 } = req.query;

    // Verify merchant has access
    if (req.user.merchantId !== merchantId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have access to this merchant\'s disputes',
        },
      });
    }

    const result = await disputesService.getDisputesByMerchant(merchantId, {
      status,
      reason,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      data: {
        disputes: result.disputes,
        total: result.total,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  })
);

/**
 * @route   GET /api/disputes/:disputeId
 * @desc    Get dispute details
 * @access  Private (JWT)
 */
router.get(
  '/:disputeId',
  authenticateJWT,
  asyncHandler(async (req, res) => {
    const { disputeId } = req.params;

    const dispute = await disputesService.getDisputeById(disputeId);

    // Verify merchant has access
    if (req.user.merchantId !== dispute.merchant_id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have access to this dispute',
        },
      });
    }

    res.json({
      success: true,
      data: dispute,
    });
  })
);

/**
 * @route   POST /api/disputes/:disputeId/evidence
 * @desc    Submit evidence for a dispute
 * @access  Private (JWT)
 */
router.post(
  '/:disputeId/evidence',
  authenticateJWT,
  asyncHandler(async (req, res) => {
    const { disputeId } = req.params;
    const evidenceData = req.body;

    const dispute = await disputesService.getDisputeById(disputeId);

    // Verify merchant has access
    if (req.user.merchantId !== dispute.merchant_id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have access to this dispute',
        },
      });
    }

    const updatedDispute = await disputesService.submitEvidence(disputeId, evidenceData);

    res.json({
      success: true,
      message: 'Evidence submitted successfully',
      data: updatedDispute,
    });
  })
);

/**
 * @route   GET /api/disputes/:disputeId/evidence
 * @desc    Get evidence files for a dispute
 * @access  Private (JWT)
 */
router.get(
  '/:disputeId/evidence',
  authenticateJWT,
  asyncHandler(async (req, res) => {
    const { disputeId } = req.params;

    const dispute = await disputesService.getDisputeById(disputeId);

    // Verify merchant has access
    if (req.user.merchantId !== dispute.merchant_id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have access to this dispute',
        },
      });
    }

    const evidence = await disputesService.getDisputeEvidence(disputeId);

    res.json({
      success: true,
      data: evidence,
    });
  })
);

/**
 * @route   POST /api/disputes/:disputeId/evidence/upload
 * @desc    Upload evidence file for a dispute
 * @access  Private (JWT)
 */
router.post(
  '/:disputeId/evidence/upload',
  authenticateJWT,
  asyncHandler(async (req, res) => {
    const { disputeId } = req.params;
    const { evidence_type, file_url, file_name, file_size, mime_type, description } = req.body;

    const dispute = await disputesService.getDisputeById(disputeId);

    // Verify merchant has access
    if (req.user.merchantId !== dispute.merchant_id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have access to this dispute',
        },
      });
    }

    if (!evidence_type || !file_url) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'evidence_type and file_url are required',
        },
      });
    }

    const evidenceFile = await disputesService.uploadEvidenceFile(
      disputeId,
      evidence_type,
      {
        file_url,
        file_name,
        file_size,
        mime_type,
        description,
      },
      req.user.merchantId
    );

    res.json({
      success: true,
      message: 'Evidence file uploaded successfully',
      data: evidenceFile,
    });
  })
);

/**
 * @route   POST /api/disputes/:disputeId/upload
 * @desc    Upload file(s) for dispute evidence (multipart upload)
 * @access  Private (JWT)
 */
router.post(
  '/:disputeId/upload',
  authenticateJWT,
  upload.array('files', 5), // Accept up to 5 files with field name 'files'
  asyncHandler(async (req, res) => {
    const { disputeId } = req.params;
    const { evidence_type, description, supabase_url } = req.body;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILES',
          message: 'No files uploaded',
        },
      });
    }

    const dispute = await disputesService.getDisputeById(disputeId);

    // Verify merchant has access
    if (req.user.merchantId !== dispute.merchant_id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have access to this dispute',
        },
      });
    }

    if (!evidence_type) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FIELD',
          message: 'evidence_type is required',
        },
      });
    }

    // Process each file
    const uploadResults = [];
    for (const file of files) {
      const result = await disputesService.uploadAndRecordEvidence(
        disputeId,
        evidence_type,
        {
          buffer: file.buffer,
          fileName: file.originalname,
          mimeType: file.mimetype,
          fileSize: file.size,
          supabaseUrl: supabase_url || `temp://${file.originalname}`, // Supabase URL should be provided from frontend
          description: description,
        },
        req.user.merchantId
      );

      uploadResults.push(result);
    }

    res.json({
      success: true,
      message: `${uploadResults.length} file(s) uploaded successfully`,
      data: uploadResults,
    });
  })
);

/**
 * @route   POST /api/disputes/:disputeId/accept
 * @desc    Accept a dispute (merchant concedes)
 * @access  Private (JWT)
 */
router.post(
  '/:disputeId/accept',
  authenticateJWT,
  asyncHandler(async (req, res) => {
    const { disputeId } = req.params;

    const dispute = await disputesService.getDisputeById(disputeId);

    // Verify merchant has access
    if (req.user.merchantId !== dispute.merchant_id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have access to this dispute',
        },
      });
    }

    const updatedDispute = await disputesService.acceptDispute(disputeId);

    res.json({
      success: true,
      message: 'Dispute accepted successfully',
      data: updatedDispute,
    });
  })
);

/**
 * @route   PUT /api/disputes/:disputeId/notes
 * @desc    Add/update merchant notes for a dispute
 * @access  Private (JWT)
 */
router.put(
  '/:disputeId/notes',
  authenticateJWT,
  asyncHandler(async (req, res) => {
    const { disputeId } = req.params;
    const { notes } = req.body;

    const dispute = await disputesService.getDisputeById(disputeId);

    // Verify merchant has access
    if (req.user.merchantId !== dispute.merchant_id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have access to this dispute',
        },
      });
    }

    if (!notes) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FIELD',
          message: 'notes field is required',
        },
      });
    }

    const updatedDispute = await disputesService.addMerchantNotes(disputeId, notes);

    res.json({
      success: true,
      message: 'Notes updated successfully',
      data: updatedDispute,
    });
  })
);

/**
 * @route   GET /api/merchants/:merchantId/disputes/stats
 * @desc    Get dispute statistics for a merchant
 * @access  Private (JWT)
 */
router.get(
  '/:merchantId/disputes/stats',
  authenticateJWT,
  asyncHandler(async (req, res) => {
    const { merchantId } = req.params;

    // Verify merchant has access
    if (req.user.merchantId !== merchantId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have access to this merchant\'s disputes',
        },
      });
    }

    const stats = await disputesService.getDisputeStats(merchantId);

    res.json({
      success: true,
      data: stats,
    });
  })
);

module.exports = router;
