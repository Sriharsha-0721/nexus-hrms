import { companyService } from '../services/companyService.js';

export const getCompanySettings = async (req, res) => {
  try {
    const settings = await companyService.getCompanySettings();
    if (!settings) {
      return res.status(404).json({ message: 'Company settings not found.' });
    }
    res.json(settings);
  } catch (err) {
    console.error('Get Company Settings Error: ', err);
    res.status(500).json({ message: err.message || 'An internal server error occurred.' });
  }
};

export const updateCompanySettings = async (req, res) => {
  const { address } = req.body;
  try {
    await companyService.updateCompanyAddress(address);
    res.json({ message: 'Company settings updated successfully.' });
  } catch (err) {
    console.error('Update Company Settings Error: ', err);
    res.status(400).json({ message: err.message });
  }
};
