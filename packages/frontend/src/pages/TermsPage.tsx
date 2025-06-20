import React from 'react';
import { Link } from 'react-router-dom';

const TermsPage: React.FC = () => {
  return (
    <div className="bg-gray-900 text-gray-300 font-sans min-h-screen p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-6">Nighthub - Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-8">Last Updated: June 20, 2025</p>

        <div className="space-y-6 prose prose-invert prose-lg">
          <p>Welcome to Nighthub! By using our website ("Service"), you agree to these terms. Please read them carefully.</p>
          
          <section>
            <h2 className="text-2xl font-semibold text-white">Age Requirements & Eligibility</h2>
            <p>You must be at least <strong>13 years old</strong> to use our Service.</p>
            <ul>
              <li>To access <strong>Safe Mode</strong>, you must be at least 13 years old.</li>
              <li>To access <strong>NSFW Mode</strong>, you must be at least <strong>18 years old</strong>.</li>
            </ul>
            <p>By using the Service, you represent and warrant that you meet the applicable age requirement for the mode you are accessing. We reserve the right to terminate the connection of any user we believe is not of the appropriate age.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white">Our Community Guidelines: Safe Mode vs. NSFW Mode</h2>
            <p>Nighthub is divided into two distinct modes with different rules. Your adherence to these rules is mandatory.</p>
            
            <div className="mt-4 p-4 border border-green-500/30 rounded-lg">
              <h3 className="text-xl font-bold text-green-400">Safe Mode (13+)</h3>
              <p>This area is for general audiences and is strictly moderated by our bot, Roe-bot, to maintain a safe and welcoming environment.</p>
              <h4 className="font-semibold mt-2">What we tolerate:</h4>
              <p>Friendly conversations, discussions about hobbies (like gaming, art, music), humor, and making new anonymous friends. Keep it clean and respectful.</p>
              <h4 className="font-semibold mt-2 text-red-400">What we DO NOT tolerate (Zero-Tolerance Policy):</h4>
              <ul>
                <li>Nudity, sexually suggestive content, or solicitation of any kind.</li>
                <li>Hate speech, racism, sexism, homophobia, or any form of targeted harassment.</li>
                <li>Grooming, discussions with minors about adult topics, or any predatory behavior.</li>
                <li>Discussions, promotion, or depiction of illegal drugs, self-harm, or violence.</li>
                <li>Spamming, scams, or sharing personal information (yours or others').</li>
              </ul>
            </div>

            <div className="mt-4 p-4 border border-red-500/30 rounded-lg">
              <h3 className="text-xl font-bold text-red-400">NSFW (Not Safe For Work) Mode (18+)</h3>
              <p>This area is for adults only and permits a wider range of expression, grounded in the principle of consensual and lawful interaction.</p>
              <h4 className="font-semibold mt-2">What we tolerate:</h4>
              <p>Adult conversations, artistic nudity, and freedom of expression between consenting adults.</p>
              <h4 className="font-semibold mt-2 text-red-400">What we DO NOT tolerate (Zero-Tolerance Policy):</h4>
              <ul>
                <li>Any content involving minors. This will result in an immediate lifetime ban and a report to the authorities.</li>
                <li>Content depicting or promoting real-world, non-consensual violence, assault, murder, torture, or any "red room" activities.</li>
                <li>Hate speech or targeted harassment that violates our core principles of safety.</li>
                <li>Sharing non-consensual explicit content or personal information ("doxxing") is strictly forbidden.</li>
                <li>Any commercial or illegal transactions.</li>
              </ul>
            </div>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold text-white">Moderation and Banning</h2>
            <p>We use automated systems and human moderators to enforce these terms. We reserve the right to terminate your access at any time, for any reason. Our strike and ban policy (e.g., 30-minute, 24-hour, permanent bans) will be enforced at our discretion.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white">Changes to Terms</h2>
            <p>We reserve the right to modify these terms at any time. If we make material changes, we will notify you by presenting the new terms upon your next visit, which you must agree to in order to continue using the Service.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white">Disclaimer</h2>
            <p>Nighthub is provided "as is." We are not responsible for the content transmitted by users or the conduct of any user on the platform. You use the service at your own risk.</p>
          </section>

        </div>
        <Link to="/" className="inline-block mt-8 text-blue-400 hover:text-blue-300">&larr; Back to Home</Link>
      </div>
    </div>
  );
};

export default TermsPage;
