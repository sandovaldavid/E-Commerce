import { sequelize } from "../models/index.js";
import ShippingAddress from "../models/shippingAddress.js";
import User from "../models/user.js";

export const createShippingAddress = async (req, res) => {
    try {
        // Destructure and validate required fields
        const {
            usuario_id: usuarioId,
            direccion,
            ciudad,
            estado_provincia: estadoProvincia,
            codigo_postal: codigoPostal,
            pais
        } = req.body;

        // Input validation
        if (!usuarioId || !direccion || !ciudad || !estadoProvincia || !codigoPostal || !pais) {
            return res.status(400).json({
                error: "All fields are required",
                required: ["usuario_id", "direccion", "ciudad", "estado_provincia", "codigo_postal", "pais"]
            });
        }

        // Check if user exists
        const userExists = await User.findByPk(usuarioId);
        if (!userExists) {
            return res.status(404).json({
                error: "User not found"
            });
        }

        // Check maximum addresses per user
        const userAddressCount = await ShippingAddress.count({
            where: { usuario_id: usuarioId }
        });

        if (userAddressCount >= 5) {
            return res.status(400).json({
                error: "Maximum number of addresses reached (5)",
                currentCount: userAddressCount
            });
        }

        // Validate postal code format (example)
        const postalCodeRegex = /^\d{5}(-\d{4})?$/;
        if (!postalCodeRegex.test(codigoPostal.trim())) {
            return res.status(400).json({
                error: "Invalid postal code format"
            });
        }

        // Create shipping address with cleaned data
        const shippingAddress = await ShippingAddress.create({
            usuario_id: usuarioId,
            direccion: direccion.trim(),
            ciudad: ciudad.trim(),
            estado_provincia: estadoProvincia.trim(),
            codigo_postal: codigoPostal.trim(),
            pais: pais.trim(),
            created_at: new Date(),
            updated_at: new Date()
        });

        // Get address with user information
        const addressWithUser = await ShippingAddress.findByPk(shippingAddress.id, {
            include: [{
                model: User,
                attributes: ['id', 'firstName', 'lastName_father']
            }]
        });

        return res.status(201).json({
            message: "Shipping address created successfully",
            data: addressWithUser
        });

    } catch (error) {
        console.error('Error creating shipping address:', {
            error: error.message,
            stack: error.stack
        });

        return res.status(500).json({
            error: "Error creating shipping address",
            details: error.message
        });
    }
};

export const getShippingAddressesByUserId = async (req, res) => {
    try {
        const { usuario_id: usuarioId } = req.params;

        // Validate user ID
        if (!usuarioId) {
            return res.status(400).json({
                error: "User ID is required"
            });
        }

        // Check if user exists
        const user = await User.findByPk(usuarioId, {
            attributes: ['id', 'firstName', 'lastName_father']
        });

        if (!user) {
            return res.status(404).json({
                error: "User not found",
                userId: usuarioId
            });
        }

        // Get addresses with pagination
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
        const offset = (page - 1) * limit;

        // Get addresses count and data in a single query
        const shippingAddresses = await ShippingAddress.findAndCountAll({
            where: { usuario_id: usuarioId },
            limit,
            offset,
            order: [['created_at', 'DESC']],
            attributes: [
                'id',
                'direccion',
                'ciudad',
                'estado_provincia',
                'codigo_postal',
                'pais',
                'created_at',
                'updated_at'
            ],
            include: [{
                model: User,
                attributes: ['id', 'firstName', 'lastName_father'],
                required: true
            }],
            distinct: true
        });

        // Handle no addresses found
        if (shippingAddresses.count === 0) {
            return res.status(404).json({
                message: "No shipping addresses found for this user",
                userId: usuarioId,
                userName: user.firstName
            });
        }

        // Calculate pagination metadata
        const totalPages = Math.ceil(shippingAddresses.count / limit);

        // Set cache headers for better performance
        res.set('Cache-Control', 'private, max-age=300');

        return res.status(200).json({
            message: "Shipping addresses retrieved successfully",
            data: {
                user: {
                    id: user.id,
                    name: `${user.firstName} ${user.lastName_father}`
                },
                addresses: shippingAddresses.rows,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalItems: shippingAddresses.count,
                    itemsPerPage: limit
                }
            }
        });

    } catch (error) {
        console.error('Error fetching shipping addresses:', {
            error: error.message,
            stack: error.stack
        });

        return res.status(500).json({
            error: "Error retrieving shipping addresses",
            details: error.message
        });
    }
};

export const getAllShippingAddresses = async (req, res) => {
    try {
        // Validate and parse pagination parameters
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
        const offset = (page - 1) * limit;

        // Optional filters
        const { ciudad, estado_provincia, pais } = req.query;
        const whereClause = {};

        if (ciudad) whereClause.ciudad = ciudad.trim();
        if (estado_provincia) whereClause.estado_provincia = estado_provincia.trim();
        if (pais) whereClause.pais = pais.trim();

        // Get total count with filters
        const totalCount = await ShippingAddress.count({
            where: whereClause
        });

        if (totalCount === 0) {
            return res.status(404).json({
                message: "No shipping addresses found",
                filters: { ciudad, estado_provincia, pais }
            });
        }

        // Get addresses with pagination and eager loading
        const shippingAddresses = await ShippingAddress.findAll({
            where: whereClause,
            limit,
            offset,
            order: [['created_at', 'DESC']],
            attributes: [
                'id',
                'direccion',
                'ciudad',
                'estado_provincia',
                'codigo_postal',
                'pais',
                'usuario_id',
                'created_at',
                'updated_at'
            ],
            include: [{
                model: User,
                attributes: ['id', 'firstName', 'lastName_father', 'lastName_mother'],
                required: true
            }],
            distinct: true
        });

        // Calculate pagination metadata
        const totalPages = Math.ceil(totalCount / limit);

        // Set cache headers
        res.set('Cache-Control', 'private, max-age=300');

        return res.status(200).json({
            message: "Shipping addresses retrieved successfully",
            data: {
                addresses: shippingAddresses,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalItems: totalCount,
                    itemsPerPage: limit
                },
                filters: {
                    ciudad,
                    estado_provincia,
                    pais
                }
            }
        });

    } catch (error) {
        console.error('Error fetching all shipping addresses:', {
            error: error.message,
            stack: error.stack
        });

        return res.status(500).json({
            error: "Error retrieving shipping addresses",
            details: error.message
        });
    }
};

export const deleteShippingAddress = async (req, res) => {
    try {
        const { id_ShippingAddress } = req.params;

        // Validate ID
        if (!id_ShippingAddress) {
            return res.status(400).json({
                error: "Shipping address ID is required"
            });
        }

        // Check if address exists and get minimal data
        const address = await ShippingAddress.findByPk(id_ShippingAddress, {
            include: [{
                model: User,
                attributes: ['id', 'firstName'],
                required: true
            }],
            attributes: ['id', 'usuario_id']
        });

        // Handle not found
        if (!address) {
            return res.status(404).json({
                error: "Shipping address not found",
                addressId: id_ShippingAddress
            });
        }

        // Verify ownership (additional security)
        if (address.usuario_id !== req.userId && !req.isAdmin) {
            return res.status(403).json({
                error: "Not authorized to delete this address"
            });
        }

        // Delete with transaction to ensure data consistency
        await sequelize.transaction(async (t) => {
            await address.destroy({ transaction: t });
        });

        // Return success response
        return res.status(200).json({
            message: "Shipping address deleted successfully",
            data: {
                id: id_ShippingAddress,
                userId: address.usuario_id,
                deletedBy: {
                    userId: req.userId,
                    isAdmin: req.isAdmin
                }
            }
        });

    } catch (error) {
        console.error('Error deleting shipping address:', {
            error: error.message,
            stack: error.stack,
            addressId: req.params.id_ShippingAddress
        });

        return res.status(500).json({
            error: "Error deleting shipping address",
            details: error.message
        });
    }
};

export const updateShippingAddress = async (req, res) => {
    try {
        const { id_ShippingAddress } = req.params;
        const {
            direccion,
            ciudad,
            estado_provincia: estadoProvincia,
            codigo_postal: codigoPostal,
            pais
        } = req.body;

        // Validate ID
        if (!id_ShippingAddress) {
            return res.status(400).json({
                error: "Shipping address ID is required"
            });
        }

        // Check if address exists with user info
        const address = await ShippingAddress.findByPk(id_ShippingAddress, {
            include: [{
                model: User,
                attributes: ['id', 'firstName'],
                required: true
            }]
        });

        if (!address) {
            return res.status(404).json({
                error: "Shipping address not found",
                addressId: id_ShippingAddress
            });
        }

        // Verify ownership
        if (address.usuario_id !== req.userId && !req.isAdmin) {
            return res.status(403).json({
                error: "Not authorized to update this address"
            });
        }

        // Validate postal code if provided
        if (codigoPostal) {
            const postalCodeRegex = /^\d{5}(-\d{4})?$/;
            if (!postalCodeRegex.test(codigoPostal.trim())) {
                return res.status(400).json({
                    error: "Invalid postal code format"
                });
            }
        }

        // Prepare update data
        const updates = {
            updated_at: new Date()
        };

        if (direccion) updates.direccion = direccion.trim();
        if (ciudad) updates.ciudad = ciudad.trim();
        if (estadoProvincia) updates.estado_provincia = estadoProvincia.trim();
        if (codigoPostal) updates.codigo_postal = codigoPostal.trim();
        if (pais) updates.pais = pais.trim();

        // Update with transaction
        const updatedAddress = await sequelize.transaction(async (t) => {
            await address.update(updates, { transaction: t });
            return address.reload({
                include: [{
                    model: User,
                    attributes: ['id', 'firstName', 'lastName_father']
                }],
                transaction: t
            });
        });

        return res.status(200).json({
            message: "Shipping address updated successfully",
            data: updatedAddress
        });

    } catch (error) {
        console.error('Error updating shipping address:', {
            error: error.message,
            stack: error.stack,
            addressId: req.params.id_ShippingAddress
        });

        return res.status(500).json({
            error: "Error updating shipping address",
            details: error.message
        });
    }
};

export const getShippingAddressById = async (req, res) => {
    try {
        const { id_ShippingAddress } = req.params;

        const address = await ShippingAddress.findByPk(id_ShippingAddress, {
            include: [{
                model: User,
                attributes: ['id', 'firstName', 'lastName_father']
            }]
        });

        if (!address) {
            return res.status(404).json({
                error: "Shipping address not found"
            });
        }

        return res.status(200).json({
            message: "Shipping address retrieved successfully",
            data: address
        });
    } catch (error) {
        console.error('Error getting shipping address:', error);
        return res.status(500).json({
            error: "Error retrieving shipping address",
            details: error.message
        });
    }
};

export const validateShippingAddress = async (req, res) => {
    try {
        const { codigo_postal, ciudad, pais } = req.body;

        // Add your address validation logic here
        const isValid = await validateAddressService(codigo_postal, ciudad, pais);

        return res.status(200).json({
            message: "Address validation completed",
            data: {
                isValid,
                details: isValid ? "Address is valid" : "Address validation failed"
            }
        });
    } catch (error) {
        console.error('Error validating address:', error);
        return res.status(500).json({
            error: "Error validating address",
            details: error.message
        });
    }
};

export const setDefaultAddress = async (req, res) => {
    try {
        const { id_ShippingAddress } = req.params;
        const { usuario_id } = req.body;

        await sequelize.transaction(async (t) => {
            // Remove default from all user addresses
            await ShippingAddress.update(
                { is_default: false },
                {
                    where: { usuario_id },
                    transaction: t
                }
            );

            // Set new default address
            await ShippingAddress.update(
                { is_default: true },
                {
                    where: { id: id_ShippingAddress },
                    transaction: t
                }
            );
        });

        return res.status(200).json({
            message: "Default address updated successfully"
        });
    } catch (error) {
        console.error('Error setting default address:', error);
        return res.status(500).json({
            error: "Error setting default address",
            details: error.message
        });
    }
};

export const bulkDeleteAddresses = async (req, res) => {
    try {
        const { addressIds } = req.body;

        await sequelize.transaction(async (t) => {
            await ShippingAddress.destroy({
                where: {
                    id: addressIds,
                    usuario_id: req.userId
                },
                transaction: t
            });
        });

        return res.status(200).json({
            message: "Addresses deleted successfully",
            data: { deletedCount: addressIds.length }
        });
    } catch (error) {
        console.error('Error bulk deleting addresses:', error);
        return res.status(500).json({
            error: "Error deleting addresses",
            details: error.message
        });
    }
};